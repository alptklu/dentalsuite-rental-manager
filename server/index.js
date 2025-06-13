import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import apartmentRoutes from './routes/apartments.js';
import bookingRoutes from './routes/bookings.js';
import backupRoutes from './routes/backup.js';
import userRoutes from './routes/users.js';
import { initDatabase } from './database/init.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL to your PostgreSQL connection string');
  process.exit(1);
}

// Initialize database
try {
  console.log('🔄 Initializing database...');
  await initDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-domain.com'
    : [
        'http://localhost:5173', 
        'http://localhost:8080',
        'http://192.168.1.104:8080',
        'http://192.168.1.104:5173'
      ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/apartments', authenticateToken, apartmentRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/backup', authenticateToken, backupRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  console.log('Looking for static files at:', distPath);
  
  // Check if dist folder exists
  try {
    const fs = await import('fs');
    if (fs.existsSync(distPath)) {
      console.log('✅ dist folder found, serving static files');
      app.use(express.static(distPath));
      
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        console.log('Serving index.html from:', indexPath);
        
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          console.error('❌ index.html not found at:', indexPath);
          res.status(500).json({ message: 'Frontend build files not found' });
        }
      });
    } else {
      console.error('❌ dist folder not found at:', distPath);
    }
  } catch (error) {
    console.error('Error checking dist folder:', error);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 