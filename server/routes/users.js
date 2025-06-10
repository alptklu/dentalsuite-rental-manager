import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { dbRun, dbGet, dbAll } from '../database/init.js';
import { hasPermission } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', hasPermission('admin'), async (req, res) => {
  try {
    const users = await dbAll(`
      SELECT id, username, email, role, active, created_at, updated_at, last_login
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user by ID (admin only)
router.get('/:id', hasPermission('admin'), async (req, res) => {
  try {
    const user = await dbGet(`
      SELECT id, username, email, role, active, created_at, updated_at, last_login
      FROM users
      WHERE id = ?
    `, [req.params.id]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/', [
  hasPermission('admin'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'viewer']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role } = req.body;

    // Check if username or email already exists
    const existingUser = await dbGet(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await dbRun(`
      INSERT INTO users (username, email, password, role, active)
      VALUES (?, ?, ?, ?, 1)
    `, [username, email, hashedPassword, role]);

    const userId = result.lastID;

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'CREATE', 'users', userId, JSON.stringify({ username, email, role })]);

    // Get created user (without password)
    const newUser = await dbGet(`
      SELECT id, username, email, role, active, created_at, updated_at
      FROM users
      WHERE id = ?
    `, [userId]);

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', [
  hasPermission('admin'),
  body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['admin', 'manager', 'viewer']).withMessage('Valid role is required'),
  body('active').optional().isBoolean().withMessage('Active must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Get old user data for audit log
    const oldUser = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    
    if (!oldUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent user from deactivating themselves
    if (updates.active === false && parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    // Prevent user from changing their own role
    if (updates.role && parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    // Check if username or email conflicts with existing users
    if (updates.username || updates.email) {
      const conflictUser = await dbGet(
        'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
        [updates.username || oldUser.username, updates.email || oldUser.email, id]
      );

      if (conflictUser) {
        return res.status(409).json({ message: 'Username or email already exists' });
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (updates.username !== undefined) {
      updateFields.push('username = ?');
      updateValues.push(updates.username);
    }

    if (updates.email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(updates.email);
    }

    if (updates.role !== undefined) {
      updateFields.push('role = ?');
      updateValues.push(updates.role);
    }

    if (updates.active !== undefined) {
      updateFields.push('active = ?');
      updateValues.push(updates.active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await dbRun(`
      UPDATE users SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, 'UPDATE', 'users', id, JSON.stringify({
      username: oldUser.username,
      email: oldUser.email,
      role: oldUser.role,
      active: oldUser.active
    }), JSON.stringify(updates)]);

    // If user was deactivated, remove all their refresh tokens
    if (updates.active === false) {
      await dbRun('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
    }

    const updatedUser = await dbGet(`
      SELECT id, username, email, role, active, created_at, updated_at, last_login
      FROM users
      WHERE id = ?
    `, [id]);

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', hasPermission('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent user from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Get user for audit log
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has created data
    const apartmentCount = await dbGet('SELECT COUNT(*) as count FROM apartments WHERE created_by = ?', [id]);
    const bookingCount = await dbGet('SELECT COUNT(*) as count FROM bookings WHERE created_by = ?', [id]);

    if (apartmentCount.count > 0 || bookingCount.count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete user with associated data. Deactivate instead.',
        associatedData: {
          apartments: apartmentCount.count,
          bookings: bookingCount.count
        }
      });
    }

    // Delete user and related data
    await dbRun('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM users WHERE id = ?', [id]);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'DELETE', 'users', id, JSON.stringify({
      username: user.username,
      email: user.email,
      role: user.role
    })]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', [
  hasPermission('admin'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    // Check if user exists
    const user = await dbGet('SELECT username FROM users WHERE id = ?', [id]);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await dbRun(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );

    // Invalidate all refresh tokens for this user
    await dbRun('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'RESET_PASSWORD', 'users', id, JSON.stringify({ 
      username: user.username, 
      resetBy: req.user.username 
    })]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', hasPermission('admin'), async (req, res) => {
  try {
    const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users');
    const activeUsers = await dbGet('SELECT COUNT(*) as count FROM users WHERE active = 1');
    const usersByRole = await dbAll(`
      SELECT role, COUNT(*) as count 
      FROM users 
      WHERE active = 1 
      GROUP BY role
    `);
    
    const recentLogins = await dbAll(`
      SELECT username, last_login, role
      FROM users 
      WHERE last_login IS NOT NULL 
      ORDER BY last_login DESC 
      LIMIT 10
    `);

    const userActivity = await dbAll(`
      SELECT u.username, u.role, COUNT(al.id) as activity_count
      FROM users u
      LEFT JOIN audit_logs al ON u.id = al.user_id
      WHERE u.active = 1
      GROUP BY u.id, u.username, u.role
      ORDER BY activity_count DESC
      LIMIT 10
    `);

    res.json({
      total: totalUsers.count,
      active: activeUsers.count,
      inactive: totalUsers.count - activeUsers.count,
      byRole: usersByRole.reduce((acc, role) => {
        acc[role.role] = role.count;
        return acc;
      }, {}),
      recentLogins,
      mostActive: userActivity
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 