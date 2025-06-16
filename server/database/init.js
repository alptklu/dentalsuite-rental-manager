import pkg from 'pg';
import bcrypt from 'bcryptjs';
import { migrateBooleanFields } from './migrate-booleans.js';

const { Pool } = pkg;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 500, // Return an error after 500ms if connection could not be established
  keepAlive: true, // Enable keep-alive
  keepAliveInitialDelayMillis: 10000 // Wait 10 seconds before initiating keep-alive
});

// Add error handler for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Helper function to execute queries
export const query = async (text, params) => {
  let client;
  try {
    client = await pool.connect();
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (over 100ms)
    if (duration > 100) {
      console.warn('Slow query:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query:', text);
    console.error('Parameters:', params);
    throw error;
  } finally {
    if (client) {
      client.release(true); // Force release the client back to the pool
    }
  }
};

// Helper functions for compatibility with existing code
export const dbRun = async (sql, params = []) => {
  const result = await query(sql, params);
  return result;
};

export const dbGet = async (sql, params = []) => {
  const result = await query(sql, params);
  return result.rows[0] || null;
};

export const dbAll = async (sql, params = []) => {
  const result = await query(sql, params);
  return result.rows;
};

export { pool as db };

export const initDatabase = async () => {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // Create apartments table
    await query(`
      CREATE TABLE IF NOT EXISTS apartments (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        properties TEXT NOT NULL,
        is_favorite BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(255) PRIMARY KEY,
        guest_name VARCHAR(255) NOT NULL,
        check_in TIMESTAMP NOT NULL,
        check_out TIMESTAMP NOT NULL,
        apartment_id VARCHAR(255) REFERENCES apartments(id) ON DELETE CASCADE,
        temporary_apartment VARCHAR(255),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit log table for tracking changes
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        record_id VARCHAR(255),
        old_values TEXT,
        new_values TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create refresh tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create backup metadata table
    await query(`
      CREATE TABLE IF NOT EXISTS backup_metadata (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        file_size INTEGER,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if admin user exists, if not create one
    const adminUser = await dbGet('SELECT * FROM users WHERE role = $1 LIMIT 1', ['admin']);
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await query(`
        INSERT INTO users (username, email, password, role)
        VALUES ($1, $2, $3, $4)
      `, ['admin', 'admin@dentalsuite.com', hashedPassword, 'admin']);
      
      console.log('Default admin user created:');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('Email: admin@dentalsuite.com');
      console.log('Please change the default password after first login!');
    }

    // Check if temporary_apartment column exists, if not add it
    try {
      const columnExists = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'temporary_apartment'
      `);
      
      if (columnExists.rows.length === 0) {
        await query('ALTER TABLE bookings ADD COLUMN temporary_apartment VARCHAR(255)');
        console.log('Migration: Added temporary_apartment column to bookings table');
      }
    } catch (error) {
      console.error('Migration error:', error);
    }

    // Run boolean field migration to fix any imported data
    try {
      await migrateBooleanFields();
    } catch (error) {
      console.error('Boolean migration error:', error);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}; 