import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { dbRun, dbGet, dbAll } from '../database/init.js';
import { generateTokens, authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Login
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    console.log('Login attempt for username:', username);

    // Find user
    const user = await dbGet(
      'SELECT * FROM users WHERE username = $1 AND active = true',
      [username]
    );

    console.log('User found in database:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User details:', { id: user.id, username: user.username, email: user.email, role: user.role });
    }

    if (!user) {
      console.log('No user found with username:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    console.log('Checking password...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Password comparison failed for user:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('Login successful for user:', username);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await dbRun(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    // Update last login
    await dbRun(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Check if refresh token exists in database and is not expired
    const storedToken = await dbGet(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (!storedToken) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Get user
    const user = await dbGet(
      'SELECT id, username, email, role, active FROM users WHERE id = $1 AND active = true',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    // Replace old refresh token with new one
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await dbRun(
      'UPDATE refresh_tokens SET token = $1, expires_at = $2 WHERE token = $3',
      [newRefreshToken, newExpiresAt, refreshToken]
    );

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      user
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove refresh token from database
      await dbRun('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout from all devices
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    // Remove all refresh tokens for the user
    await dbRun('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await dbGet('SELECT * FROM users WHERE id = $1', [req.user.id]);

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await dbRun(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );

    // Invalidate all refresh tokens to force re-login
    await dbRun('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, username, email, role, active, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Debug endpoint to check users (remove in production)
router.get('/debug/users', async (req, res) => {
  try {
    const users = await dbAll('SELECT id, username, email, role, active, created_at FROM users');
    const adminUser = await dbGet('SELECT id, username, email, role, active, created_at FROM users WHERE role = $1', ['admin']);
    
    // Check if password field exists and has values (without exposing passwords)
    const usersWithPasswordCheck = await dbAll(`
      SELECT 
        id, 
        username, 
        email, 
        role, 
        active, 
        created_at,
        CASE WHEN password IS NULL THEN 'NULL' 
             WHEN password = '' THEN 'EMPTY' 
             ELSE 'EXISTS' 
        END as password_status,
        length(password) as password_length
      FROM users
    `);
    
    const adminWithPasswordCheck = await dbGet(`
      SELECT 
        id, 
        username, 
        email, 
        role, 
        active, 
        created_at,
        CASE WHEN password IS NULL THEN 'NULL' 
             WHEN password = '' THEN 'EMPTY' 
             ELSE 'EXISTS' 
        END as password_status,
        length(password) as password_length
      FROM users WHERE role = $1
    `, ['admin']);
    
    res.json({
      message: 'Debug info',
      totalUsers: users.length,
      users: users,
      usersWithPasswordCheck: usersWithPasswordCheck,
      adminUser: adminUser,
      adminWithPasswordCheck: adminWithPasswordCheck,
      hasAdminUser: !!adminUser
    });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Debug endpoint to test password functionality (remove in production)
router.post('/debug/password-test', async (req, res) => {
  try {
    const testPassword = 'admin123';
    
    // Hash the test password
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // Test comparison
    const isValid = await bcrypt.compare(testPassword, hashedPassword);
    
    // Get admin user's actual password hash
    const adminUser = await dbGet('SELECT id, username, password FROM users WHERE role = $1', ['admin']);
    
    let adminPasswordTest = null;
    if (adminUser && adminUser.password) {
      adminPasswordTest = await bcrypt.compare(testPassword, adminUser.password);
    }
    
    res.json({
      message: 'Password debug test',
      testPassword: testPassword,
      hashedLength: hashedPassword.length,
      hashTestPassed: isValid,
      adminUser: adminUser ? {
        id: adminUser.id,
        username: adminUser.username,
        hasPassword: !!adminUser.password,
        passwordLength: adminUser.password ? adminUser.password.length : 0
      } : null,
      adminPasswordTest: adminPasswordTest,
      bcryptVersion: 'bcryptjs'
    });
  } catch (error) {
    console.error('Password debug error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Debug endpoint to recreate admin user (remove in production)
router.post('/debug/recreate-admin', async (req, res) => {
  try {
    // Delete existing admin user if exists
    await dbRun('DELETE FROM users WHERE username = $1', ['admin']);
    
    // Create new admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await dbRun(`
      INSERT INTO users (username, email, password, role)
      VALUES ($1, $2, $3, $4)
    `, ['admin', 'admin@dentalsuite.com', hashedPassword, 'admin']);
    
    // Verify creation
    const newAdmin = await dbGet(`
      SELECT 
        id, 
        username, 
        email, 
        role, 
        active, 
        created_at,
        CASE WHEN password IS NULL THEN 'NULL' 
             WHEN password = '' THEN 'EMPTY' 
             ELSE 'EXISTS' 
        END as password_status,
        length(password) as password_length
      FROM users WHERE username = $1
    `, ['admin']);
    
    res.json({
      message: 'Admin user recreated',
      newAdmin: newAdmin,
      success: !!newAdmin
    });
  } catch (error) {
    console.error('Recreate admin error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default router; 