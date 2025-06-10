import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database/init.js';
import { hasPermission } from '../middleware/auth.js';

const router = express.Router();

// Get all bookings with apartment details
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, apartment_id, guest_name } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (apartment_id) {
      whereClause += ' WHERE b.apartment_id = ?';
      queryParams.push(apartment_id);
    }

    if (guest_name) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ' b.guest_name LIKE ?';
      queryParams.push(`%${guest_name}%`);
    }

    const bookings = await dbAll(`
      SELECT b.*, a.name as apartment_name, u.username as created_by_username
      FROM bookings b
      LEFT JOIN apartments a ON b.apartment_id = a.id
      LEFT JOIN users u ON b.created_by = u.id
      ${whereClause}
      ORDER BY b.check_in DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    // Convert ISO strings back to Date objects for frontend compatibility
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      checkIn: new Date(booking.check_in),
      checkOut: new Date(booking.check_out)
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await dbGet(`
      SELECT b.*, a.name as apartment_name, u.username as created_by_username
      FROM bookings b
      LEFT JOIN apartments a ON b.apartment_id = a.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `, [req.params.id]);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const formattedBooking = {
      ...booking,
      checkIn: new Date(booking.check_in),
      checkOut: new Date(booking.check_out)
    };

    res.json(formattedBooking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create booking (manager or admin)
router.post('/', [
  hasPermission('manager'),
  body('guest_name').trim().notEmpty().withMessage('Guest name is required'),
  body('check_in').isISO8601().withMessage('Valid check-in date is required'),
  body('check_out').isISO8601().withMessage('Valid check-out date is required'),
  body('apartment_id').optional().custom((value) => {
    if (value === null || value === undefined || typeof value === 'string') {
      return true;
    }
    throw new Error('Apartment ID must be a string or null');
  }),
  body('temporary_apartment').optional().isString().withMessage('Temporary apartment must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { guest_name, check_in, check_out, apartment_id, temporary_apartment } = req.body;
    const id = uuidv4();

    // Validate dates
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }

    // Check for overlapping bookings if apartment is specified
    if (apartment_id) {
      const overlappingBooking = await dbGet(`
        SELECT * FROM bookings 
        WHERE apartment_id = ? 
        AND ((check_in <= ? AND check_out > ?) OR (check_in < ? AND check_out >= ?))
      `, [apartment_id, check_in, check_in, check_out, check_out]);

      if (overlappingBooking) {
        return res.status(409).json({ 
          message: 'Apartment is not available for the selected dates',
          conflictingBooking: overlappingBooking
        });
      }

      // Verify apartment exists
      const apartment = await dbGet('SELECT * FROM apartments WHERE id = ?', [apartment_id]);
      if (!apartment) {
        return res.status(404).json({ message: 'Apartment not found' });
      }
    }

    await dbRun(`
      INSERT INTO bookings (id, guest_name, check_in, check_out, apartment_id, temporary_apartment, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, guest_name, check_in, check_out, apartment_id || null, temporary_apartment || null, req.user.id]);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'CREATE', 'bookings', id, JSON.stringify({ guest_name, check_in, check_out, apartment_id, temporary_apartment })]);

    const newBooking = await dbGet(`
      SELECT b.*, a.name as apartment_name, u.username as created_by_username
      FROM bookings b
      LEFT JOIN apartments a ON b.apartment_id = a.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `, [id]);

    const formattedBooking = {
      ...newBooking,
      checkIn: new Date(newBooking.check_in),
      checkOut: new Date(newBooking.check_out)
    };

    res.status(201).json(formattedBooking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update booking (manager or admin)
router.put('/:id', [
  hasPermission('manager'),
  body('guest_name').optional().trim().notEmpty().withMessage('Guest name cannot be empty'),
  body('check_in').optional().isISO8601().withMessage('Valid check-in date is required'),
  body('check_out').optional().isISO8601().withMessage('Valid check-out date is required'),
  body('apartment_id').optional().custom((value) => {
    if (value === null || value === undefined || typeof value === 'string') {
      return true;
    }
    throw new Error('Apartment ID must be a string or null');
  }),
  body('temporary_apartment').optional().custom((value) => {
    if (value === null || value === undefined || typeof value === 'string') {
      return true;
    }
    throw new Error('Temporary apartment must be a string or null');
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Get old booking for audit log
    const oldBooking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    
    if (!oldBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Validate date updates
    if (updates.check_in || updates.check_out) {
      const checkInDate = new Date(updates.check_in || oldBooking.check_in);
      const checkOutDate = new Date(updates.check_out || oldBooking.check_out);

      if (checkOutDate <= checkInDate) {
        return res.status(400).json({ message: 'Check-out date must be after check-in date' });
      }

      // Check for overlapping bookings
      const apartmentId = updates.apartment_id !== undefined ? updates.apartment_id : oldBooking.apartment_id;
      
      if (apartmentId) {
        const overlappingBooking = await dbGet(`
          SELECT * FROM bookings 
          WHERE apartment_id = ? AND id != ?
          AND ((check_in <= ? AND check_out > ?) OR (check_in < ? AND check_out >= ?))
        `, [apartmentId, id, checkInDate.toISOString(), checkInDate.toISOString(), 
            checkOutDate.toISOString(), checkOutDate.toISOString()]);

        if (overlappingBooking) {
          return res.status(409).json({ 
            message: 'Apartment is not available for the selected dates',
            conflictingBooking: overlappingBooking
          });
        }
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (updates.guest_name !== undefined) {
      updateFields.push('guest_name = ?');
      updateValues.push(updates.guest_name);
    }

    if (updates.check_in !== undefined) {
      updateFields.push('check_in = ?');
      updateValues.push(updates.check_in);
    }

    if (updates.check_out !== undefined) {
      updateFields.push('check_out = ?');
      updateValues.push(updates.check_out);
    }

    if (updates.apartment_id !== undefined) {
      updateFields.push('apartment_id = ?');
      updateValues.push(updates.apartment_id || null);
    }

    if (updates.temporary_apartment !== undefined) {
      updateFields.push('temporary_apartment = ?');
      updateValues.push(updates.temporary_apartment || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await dbRun(`
      UPDATE bookings SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, 'UPDATE', 'bookings', id, JSON.stringify(oldBooking), JSON.stringify(updates)]);

    const updatedBooking = await dbGet(`
      SELECT b.*, a.name as apartment_name, u.username as created_by_username
      FROM bookings b
      LEFT JOIN apartments a ON b.apartment_id = a.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `, [id]);

    const formattedBooking = {
      ...updatedBooking,
      checkIn: new Date(updatedBooking.check_in),
      checkOut: new Date(updatedBooking.check_out)
    };

    res.json(formattedBooking);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete booking (manager or admin)
router.delete('/:id', hasPermission('manager'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get booking for audit log
    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await dbRun('DELETE FROM bookings WHERE id = ?', [id]);

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'DELETE', 'bookings', id, JSON.stringify(booking)]);

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get available apartments for date range
router.post('/available-apartments', [
  body('check_in').isISO8601().withMessage('Valid check-in date is required'),
  body('check_out').isISO8601().withMessage('Valid check-out date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { check_in, check_out } = req.body;

    // Get all apartments
    const allApartments = await dbAll('SELECT * FROM apartments ORDER BY is_favorite DESC, name ASC');

    // Get apartments that have overlapping bookings
    const unavailableApartments = await dbAll(`
      SELECT DISTINCT apartment_id FROM bookings
      WHERE apartment_id IS NOT NULL
      AND ((check_in <= ? AND check_out > ?) OR (check_in < ? AND check_out >= ?))
    `, [check_in, check_in, check_out, check_out]);

    const unavailableIds = unavailableApartments.map(apt => apt.apartment_id);

    // Filter out unavailable apartments
    const availableApartments = allApartments.filter(apt => !unavailableIds.includes(apt.id));

    const formattedApartments = availableApartments.map(apt => ({
      ...apt,
      properties: JSON.parse(apt.properties || '[]'),
      isFavorite: Boolean(apt.is_favorite)
    }));

    res.json(formattedApartments);
  } catch (error) {
    console.error('Get available apartments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Batch create bookings (manager or admin)
router.post('/batch', [
  hasPermission('manager'),
  body('bookings').isArray().withMessage('Bookings must be an array'),
  body('bookings.*.guest_name').trim().notEmpty().withMessage('Guest name is required'),
  body('bookings.*.check_in').isISO8601().withMessage('Valid check-in date is required'),
  body('bookings.*.check_out').isISO8601().withMessage('Valid check-out date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bookings } = req.body;
    const createdBookings = [];

    for (const booking of bookings) {
      const id = uuidv4();
      const { guest_name, check_in, check_out, apartment_id } = booking;

      // Validate dates
      const checkInDate = new Date(check_in);
      const checkOutDate = new Date(check_out);

      if (checkOutDate <= checkInDate) {
        continue; // Skip invalid bookings
      }

      await dbRun(`
        INSERT INTO bookings (id, guest_name, check_in, check_out, apartment_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, guest_name, check_in, check_out, apartment_id || null, req.user.id]);

      // Log the action
      await dbRun(`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (?, ?, ?, ?, ?)
      `, [req.user.id, 'CREATE', 'bookings', id, JSON.stringify(booking)]);

      createdBookings.push(id);
    }

    res.status(201).json({ 
      message: `${createdBookings.length} bookings created successfully`,
      createdCount: createdBookings.length,
      bookingIds: createdBookings
    });
  } catch (error) {
    console.error('Batch create bookings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete all bookings (admin only)
router.delete('/', hasPermission('admin'), async (req, res) => {
  try {
    // Get all bookings for audit log
    const allBookings = await dbAll('SELECT * FROM bookings');
    
    if (allBookings.length === 0) {
      return res.json({ message: 'No bookings to delete', deletedCount: 0 });
    }

    // Delete all bookings
    await dbRun('DELETE FROM bookings');

    // Log the action
    await dbRun(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'DELETE_ALL', 'bookings', 'ALL', JSON.stringify({ count: allBookings.length })]);

    res.json({ 
      message: `${allBookings.length} bookings deleted successfully`,
      deletedCount: allBookings.length
    });
  } catch (error) {
    console.error('Delete all bookings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 