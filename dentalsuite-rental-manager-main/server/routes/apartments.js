import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database/init.js';
import { hasPermission } from '../middleware/auth.js';

const router = express.Router();

// Get all apartments
router.get('/', async (req, res) => {
  try {
    const apartments = await dbAll(`
      SELECT a.*, u.username as created_by_username 
      FROM apartments a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `);

    // Parse properties JSON string back to array
    const formattedApartments = apartments.map(apt => ({
      ...apt,
      properties: JSON.parse(apt.properties || '[]'),
      isFavorite: Boolean(apt.is_favorite)
    }));

    res.json(formattedApartments);
  } catch (error) {
    console.error('Get apartments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get apartment by ID
router.get('/:id', async (req, res) => {
  try {
    const apartment = await dbGet(`
      SELECT a.*, u.username as created_by_username 
      FROM apartments a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `, [req.params.id]);

    if (!apartment) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    const formattedApartment = {
      ...apartment,
      properties: JSON.parse(apartment.properties || '[]'),
      isFavorite: Boolean(apartment.is_favorite)
    };

    res.json(formattedApartment);
  } catch (error) {
    console.error('Get apartment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create apartment (manager or admin)
router.post('/', [
  hasPermission('manager'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('properties').isArray().withMessage('Properties must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, properties } = req.body;
    const id = uuidv4();

    await dbRun(`
      INSERT INTO apartments (id, name, properties, created_by)
      VALUES (?, ?, ?, ?)
    `, [id, name, JSON.stringify(properties), req.user.id]);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'CREATE', 'apartments', id, JSON.stringify({ name, properties })]);

    const newApartment = await dbGet(`
      SELECT a.*, u.username as created_by_username 
      FROM apartments a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `, [id]);

    const formattedApartment = {
      ...newApartment,
      properties: JSON.parse(newApartment.properties || '[]'),
      isFavorite: Boolean(newApartment.is_favorite)
    };

    res.status(201).json(formattedApartment);
  } catch (error) {
    console.error('Create apartment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update apartment (manager or admin)
router.put('/:id', [
  hasPermission('manager'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('properties').optional().isArray().withMessage('Properties must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Get old values for audit log
    const oldApartment = await dbGet('SELECT * FROM apartments WHERE id = ?', [id]);
    
    if (!oldApartment) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    const updateFields = [];
    const updateValues = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updates.name);
    }

    if (updates.properties !== undefined) {
      updateFields.push('properties = ?');
      updateValues.push(JSON.stringify(updates.properties));
    }

    if (updates.isFavorite !== undefined) {
      updateFields.push('is_favorite = ?');
      updateValues.push(updates.isFavorite ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await dbRun(`
      UPDATE apartments SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, 'UPDATE', 'apartments', id, JSON.stringify(oldApartment), JSON.stringify(updates)]);

    const updatedApartment = await dbGet(`
      SELECT a.*, u.username as created_by_username 
      FROM apartments a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `, [id]);

    const formattedApartment = {
      ...updatedApartment,
      properties: JSON.parse(updatedApartment.properties || '[]'),
      isFavorite: Boolean(updatedApartment.is_favorite)
    };

    res.json(formattedApartment);
  } catch (error) {
    console.error('Update apartment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete apartment (admin only)
router.delete('/:id', hasPermission('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get apartment for audit log
    const apartment = await dbGet('SELECT * FROM apartments WHERE id = ?', [id]);
    
    if (!apartment) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    // Check if apartment has bookings
    const bookingCount = await dbGet('SELECT COUNT(*) as count FROM bookings WHERE apartment_id = ?', [id]);
    
    if (bookingCount.count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete apartment with existing bookings',
        bookingCount: bookingCount.count
      });
    }

    await dbRun('DELETE FROM apartments WHERE id = ?', [id]);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'DELETE', 'apartments', id, JSON.stringify(apartment)]);

    res.json({ message: 'Apartment deleted successfully' });
  } catch (error) {
    console.error('Delete apartment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Toggle apartment favorite
router.patch('/:id/favorite', hasPermission('manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const apartment = await dbGet('SELECT * FROM apartments WHERE id = ?', [id]);
    
    if (!apartment) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    const newFavoriteValue = apartment.is_favorite ? 0 : 1;

    await dbRun(`
      UPDATE apartments SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newFavoriteValue, id]);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, 'UPDATE', 'apartments', id, 
        JSON.stringify({ is_favorite: apartment.is_favorite }), 
        JSON.stringify({ is_favorite: newFavoriteValue })]);

    res.json({ message: 'Apartment favorite status updated', isFavorite: Boolean(newFavoriteValue) });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 