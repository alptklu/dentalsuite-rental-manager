import jwt from 'jsonwebtoken';
import { dbGet } from '../database/init.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const user = await dbGet(
      'SELECT id, username, email, role, active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user || !user.active) {
      return res.status(403).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Insufficient privileges',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Role hierarchy: admin > manager > viewer
export const hasPermission = (requiredLevel) => {
  const roleHierarchy = {
    'viewer': 1,
    'manager': 2,
    'admin': 3
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevelValue = roleHierarchy[requiredLevel] || 0;

    if (userLevel < requiredLevelValue) {
      return res.status(403).json({ 
        message: 'Insufficient privileges',
        required: requiredLevel,
        current: req.user.role
      });
    }

    next();
  };
};

export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}; 