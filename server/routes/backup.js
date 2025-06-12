import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database/init.js';
import { hasPermission } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'backup-' + uniqueSuffix + '.json');
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'), false);
    }
  }
});

// Export data (admin only)
router.get('/export', hasPermission('admin'), async (req, res) => {
  try {
    // Get all data from database
    const apartments = await dbAll('SELECT * FROM apartments ORDER BY created_at');
    const bookings = await dbAll('SELECT * FROM bookings ORDER BY created_at');
    const users = await dbAll('SELECT id, username, email, role, active, created_at, last_login FROM users ORDER BY created_at');
    const auditLogs = await dbAll('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000'); // Last 1000 audit logs

    // Format data for export
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: req.user.username,
      data: {
        apartments: apartments.map(apt => ({
          ...apt,
          properties: JSON.parse(apt.properties || '[]'),
          isFavorite: Boolean(apt.is_favorite)
        })),
        bookings: bookings.map(booking => ({
          ...booking,
          checkIn: booking.check_in,
          checkOut: booking.check_out
        })),
        users,
        auditLogs
      },
      statistics: {
        apartmentCount: apartments.length,
        bookingCount: bookings.length,
        userCount: users.length,
        auditLogCount: auditLogs.length
      }
    };

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dentalsuite-backup-${timestamp}.json`;

    // Save backup metadata
    await dbRun(`
      INSERT INTO backup_metadata (filename, file_size, created_by)
      VALUES ($1, $2, $3)
    `, [filename, JSON.stringify(exportData).length, req.user.id]);

    // Get the inserted backup ID for audit log
    const backupRecord = await dbGet('SELECT id FROM backup_metadata WHERE filename = $1 ORDER BY id DESC LIMIT 1', [filename]);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.user.id, 'EXPORT', 'backup', backupRecord.id, JSON.stringify({ filename, statistics: exportData.statistics })]);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Import data (admin only)
router.post('/import', [hasPermission('admin'), upload.single('backup')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file provided' });
    }

    // Read and parse the uploaded file
    const fileContent = await fs.readFile(req.file.path, 'utf-8');
    let backupData;

    try {
      backupData = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(400).json({ message: 'Invalid JSON file' });
    }

    // Validate backup data structure
    if (!backupData.data || !backupData.version) {
      return res.status(400).json({ message: 'Invalid backup file format' });
    }

    const { apartments = [], bookings = [], users = [] } = backupData.data;
    const { replace = false } = req.body; // Option to replace existing data

    let importedCounts = {
      apartments: 0,
      bookings: 0,
      users: 0
    };

    // Begin transaction-like operations
    try {
      // If replace mode, clear existing data (except current user)
      if (replace) {
        await dbRun('DELETE FROM bookings');
        await dbRun('DELETE FROM apartments');
        await dbRun('DELETE FROM users WHERE id != $1', [req.user.id]);
      }

      // Import apartments
      for (const apartment of apartments) {
        try {
          await dbRun(`
            INSERT INTO apartments (id, name, properties, is_favorite, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            properties = EXCLUDED.properties,
            is_favorite = EXCLUDED.is_favorite,
            updated_at = EXCLUDED.updated_at
          `, [
            apartment.id,
            apartment.name,
            JSON.stringify(apartment.properties || []),
            apartment.isFavorite ? true : false,
            req.user.id, // Set current user as creator for imported data
            apartment.created_at || new Date().toISOString(),
            apartment.updated_at || new Date().toISOString()
          ]);
          importedCounts.apartments++;
        } catch (error) {
          console.error('Error importing apartment:', apartment.id, error);
        }
      }

      // Import bookings
      for (const booking of bookings) {
        try {
          await dbRun(`
            INSERT INTO bookings (id, guest_name, check_in, check_out, apartment_id, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
            guest_name = EXCLUDED.guest_name,
            check_in = EXCLUDED.check_in,
            check_out = EXCLUDED.check_out,
            apartment_id = EXCLUDED.apartment_id,
            updated_at = EXCLUDED.updated_at
          `, [
            booking.id,
            booking.guest_name,
            booking.checkIn || booking.check_in,
            booking.checkOut || booking.check_out,
            booking.apartment_id,
            req.user.id, // Set current user as creator for imported data
            booking.created_at || new Date().toISOString(),
            booking.updated_at || new Date().toISOString()
          ]);
          importedCounts.bookings++;
        } catch (error) {
          console.error('Error importing booking:', booking.id, error);
        }
      }

      // Import users
      for (const user of users) {
        try {
          if (replace) {
            // In replace mode, import all users except if they have the same ID as current user
            if (user.id !== req.user.id) {
              await dbRun(`
                INSERT INTO users (username, email, password, role, active, created_at, last_login)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
              `, [
                user.username,
                user.email,
                user.password || '$2a$10$defaulthash', // Default hash, user will need to reset password
                user.role || 'viewer',
                user.active !== undefined ? user.active : true,
                user.created_at || new Date().toISOString(),
                user.last_login
              ]);
              importedCounts.users++;
            }
          } else {
            // In non-replace mode, only import users that don't already exist
            const existingUser = await dbGet('SELECT id FROM users WHERE username = $1 OR email = $2', [user.username, user.email]);
            if (!existingUser) {
              await dbRun(`
                INSERT INTO users (username, email, password, role, active, created_at, last_login)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
              `, [
                user.username,
                user.email,
                user.password || '$2a$10$defaulthash', // Default hash, user will need to reset password
                user.role || 'viewer',
                user.active !== undefined ? user.active : true,
                user.created_at || new Date().toISOString(),
                user.last_login
              ]);
              importedCounts.users++;
            }
          }
        } catch (error) {
          console.error('Error importing user:', user.username, error);
        }
      }

      // Save import metadata
      await dbRun(`
        INSERT INTO backup_metadata (filename, file_size, created_by)
        VALUES ($1, $2, $3)
      `, [`import-${req.file.filename}`, req.file.size, req.user.id]);

      // Get the inserted backup ID for audit log
      const importRecord = await dbGet('SELECT id FROM backup_metadata WHERE filename = $1 ORDER BY id DESC LIMIT 1', [`import-${req.file.filename}`]);

      // Log the action
      await dbRun(`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES ($1, $2, $3, $4, $5)
      `, [req.user.id, 'IMPORT', 'backup', importRecord.id, JSON.stringify({ 
        filename: req.file.filename, 
        importedCounts,
        replaceMode: replace
      })]);

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      res.json({
        message: 'Data imported successfully',
        imported: importedCounts,
        replaceMode: replace
      });
    } catch (importError) {
      console.error('Import transaction error:', importError);
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      res.status(500).json({ message: 'Error importing data' });
    }
  } catch (error) {
    console.error('Import data error:', error);
    // Clean up uploaded file if it exists
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get backup history (admin only)
router.get('/history', hasPermission('admin'), async (req, res) => {
  try {
    const backups = await dbAll(`
      SELECT bm.*, u.username as created_by_username
      FROM backup_metadata bm
      LEFT JOIN users u ON bm.created_by = u.id
      ORDER BY bm.created_at DESC
      LIMIT 50
    `);

    res.json(backups);
  } catch (error) {
    console.error('Get backup history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get database statistics (admin only)
router.get('/stats', hasPermission('admin'), async (req, res) => {
  try {
    const apartmentCount = await dbGet('SELECT COUNT(*) as count FROM apartments');
    const bookingCount = await dbGet('SELECT COUNT(*) as count FROM bookings');
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users WHERE active = true');
    const auditLogCount = await dbGet('SELECT COUNT(*) as count FROM audit_logs');
    const backupCount = await dbGet('SELECT COUNT(*) as count FROM backup_metadata');

    // Get recent activity
    const recentActivity = await dbAll(`
      SELECT al.*, u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 10
    `);

    // Get database size (approximate) - PostgreSQL equivalent
    const dbSize = await dbGet(`
      SELECT pg_database_size(current_database()) as size
    `);

    res.json({
      statistics: {
        apartments: apartmentCount.count,
        bookings: bookingCount.count,
        users: userCount.count,
        auditLogs: auditLogCount.count,
        backups: backupCount.count,
        databaseSize: dbSize.size
      },
      recentActivity
    });
  } catch (error) {
    console.error('Get backup stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Clear old audit logs (admin only)
router.delete('/cleanup/audit-logs', hasPermission('admin'), async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const result = await dbRun(`
      DELETE FROM audit_logs 
      WHERE timestamp < NOW() - INTERVAL '$1 days'
    `, [days]);

    // Log the cleanup action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, new_values)
      VALUES ($1, $2, $3, $4)
    `, [req.user.id, 'CLEANUP', 'audit_logs', JSON.stringify({ daysOld: days, deletedCount: result.changes })]);

    res.json({
      message: `Cleaned up audit logs older than ${days} days`,
      deletedCount: result.changes
    });
  } catch (error) {
    console.error('Cleanup audit logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 