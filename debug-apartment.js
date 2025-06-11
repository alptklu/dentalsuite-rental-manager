// Quick debug script to test apartment creation
import { dbRun, dbGet, initDatabase } from './server/database/init.js';
import { v4 as uuidv4 } from 'uuid';

async function testApartmentCreation() {
  try {
    console.log('🔄 Testing database connection...');
    
    // Test basic connection
    const users = await dbGet('SELECT COUNT(*) as count FROM users');
    console.log('✅ Users in database:', users.count);
    
    // Test apartment creation
    console.log('🔄 Testing apartment creation...');
    
    const id = uuidv4();
    const name = 'Test Apartment';
    const properties = ['WiFi', 'Kitchen'];
    const userId = 1; // Assuming admin user has ID 1
    
    console.log('Attempting to insert apartment with:');
    console.log('- ID:', id);
    console.log('- Name:', name);
    console.log('- Properties:', JSON.stringify(properties));
    console.log('- User ID:', userId);
    
    const result = await dbRun(`
      INSERT INTO apartments (id, name, properties, created_by)
      VALUES ($1, $2, $3, $4)
    `, [id, name, JSON.stringify(properties), userId]);
    
    console.log('✅ Apartment created successfully');
    console.log('Result:', result);
    
    // Verify it was created
    const apartment = await dbGet('SELECT * FROM apartments WHERE id = $1', [id]);
    console.log('✅ Apartment retrieved:', apartment);
    
    // Clean up
    await dbRun('DELETE FROM apartments WHERE id = $1', [id]);
    console.log('✅ Test apartment cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  }
}

// Run the test
testApartmentCreation(); 