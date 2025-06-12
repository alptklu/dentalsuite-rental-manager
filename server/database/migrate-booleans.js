import { query, dbAll } from './init.js';

export const migrateBooleanFields = async () => {
  try {
    console.log('Starting boolean field migration...');

    // Check if there are any integer values in boolean columns
    const usersWithIntegerActive = await dbAll(`
      SELECT id, active 
      FROM users 
      WHERE active::text IN ('0', '1')
    `);

    const apartmentsWithIntegerFavorite = await dbAll(`
      SELECT id, is_favorite 
      FROM apartments 
      WHERE is_favorite::text IN ('0', '1')
    `);

    console.log(`Found ${usersWithIntegerActive.length} users with integer active values`);
    console.log(`Found ${apartmentsWithIntegerFavorite.length} apartments with integer is_favorite values`);

    // Fix users table - convert integer active values to boolean
    if (usersWithIntegerActive.length > 0) {
      await query(`
        UPDATE users 
        SET active = CASE 
          WHEN active::text = '1' THEN true 
          WHEN active::text = '0' THEN false 
          ELSE active 
        END
        WHERE active::text IN ('0', '1')
      `);
      console.log(`Fixed ${usersWithIntegerActive.length} user active values`);
    }

    // Fix apartments table - convert integer is_favorite values to boolean
    if (apartmentsWithIntegerFavorite.length > 0) {
      await query(`
        UPDATE apartments 
        SET is_favorite = CASE 
          WHEN is_favorite::text = '1' THEN true 
          WHEN is_favorite::text = '0' THEN false 
          ELSE is_favorite 
        END
        WHERE is_favorite::text IN ('0', '1')
      `);
      console.log(`Fixed ${apartmentsWithIntegerFavorite.length} apartment is_favorite values`);
    }

    // Ensure columns are properly typed as boolean
    try {
      await query(`
        ALTER TABLE users 
        ALTER COLUMN active TYPE BOOLEAN 
        USING CASE 
          WHEN active::text = '1' THEN true 
          WHEN active::text = '0' THEN false 
          ELSE active::boolean 
        END
      `);
      console.log('Ensured users.active is properly typed as boolean');
    } catch (error) {
      console.log('users.active column already properly typed');
    }

    try {
      await query(`
        ALTER TABLE apartments 
        ALTER COLUMN is_favorite TYPE BOOLEAN 
        USING CASE 
          WHEN is_favorite::text = '1' THEN true 
          WHEN is_favorite::text = '0' THEN false 
          ELSE is_favorite::boolean 
        END
      `);
      console.log('Ensured apartments.is_favorite is properly typed as boolean');
    } catch (error) {
      console.log('apartments.is_favorite column already properly typed');
    }

    console.log('Boolean field migration completed successfully');
    return true;
  } catch (error) {
    console.error('Boolean field migration error:', error);
    throw error;
  }
}; 