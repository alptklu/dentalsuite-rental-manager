// Test script for deployed API
const BASE_URL = 'https://dentalsuite-rental-manager.onrender.com/api';

async function testAPI() {
  console.log('🔄 Testing deployed API...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    console.log(`   Status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`   Response: ${JSON.stringify(healthData)}`);
    } else {
      console.log(`   Error: ${await healthResponse.text()}`);
    }
    
    // Test login (to get a token)
    console.log('\n2. Testing login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin', // Default admin username
        password: 'admin123' // Default admin password
      })
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    let token = null;
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      token = loginData.token;
      console.log(`   Login successful, token received`);
    } else {
      const errorText = await loginResponse.text();
      console.log(`   Login failed: ${errorText}`);
      return;
    }
    
    // Test bookings endpoint
    console.log('\n3. Testing bookings endpoint...');
    const bookingsResponse = await fetch(`${BASE_URL}/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${bookingsResponse.status}`);
    if (bookingsResponse.ok) {
      const bookingsData = await bookingsResponse.json();
      console.log(`   Found ${bookingsData.length} bookings`);
    } else {
      const errorText = await bookingsResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Test apartments endpoint
    console.log('\n4. Testing apartments endpoint...');
    const apartmentsResponse = await fetch(`${BASE_URL}/apartments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${apartmentsResponse.status}`);
    if (apartmentsResponse.ok) {
      const apartmentsData = await apartmentsResponse.json();
      console.log(`   Found ${apartmentsData.length} apartments`);
    } else {
      const errorText = await apartmentsResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Test a booking update (if we have bookings)
    if (token) {
      console.log('\n5. Testing booking update...');
      
      // First get a booking to update
      const testBookingsResponse = await fetch(`${BASE_URL}/bookings?limit=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (testBookingsResponse.ok) {
        const testBookings = await testBookingsResponse.json();
        if (testBookings.length > 0) {
          const bookingId = testBookings[0].id;
          console.log(`   Testing update on booking: ${bookingId}`);
          
          const updateResponse = await fetch(`${BASE_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              guest_name: testBookings[0].guest_name // Just update with same name to test
            })
          });
          
          console.log(`   Update Status: ${updateResponse.status}`);
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.log(`   Update Error: ${errorText}`);
          } else {
            console.log(`   Update successful`);
          }
        } else {
          console.log(`   No bookings found to test update`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAPI(); 