/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */
// Test script for admin authentication
// Run this with: node test-admin-auth.js

const fetch = require('node-fetch');

const BASE_URL = 'https://studioo-production-eb03.up.railway.app';
// const BASE_URL = 'http://localhost:3000';

async function testAdminAuth() {
  console.log('Testing Admin Authentication Flow...\n');

  // Step 1: Login as gatat123
  console.log('1. Logging in as gatat123...');
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'gatat123',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    console.log('Login response:', loginData);

    if (!loginResponse.ok) {
      console.error('Login failed:', loginData);
      return;
    }

    const token = loginData.accessToken || loginData.token;
    if (!token) {
      console.error('No token received from login');
      return;
    }

    console.log('✓ Login successful, token received\n');

    // Step 2: Test admin endpoints
    const adminEndpoints = [
      '/api/admin/stats',
      '/api/admin/users',
      '/api/admin/system/status',
      '/api/admin/projects/stats'
    ];

    for (const endpoint of adminEndpoints) {
      console.log(`\n2. Testing ${endpoint}...`);

      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        console.log(`Response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log(`✓ Success! Data received:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(`✗ Failed:`, response.status, errorData);
        }
      } catch (error) {
        console.error(`✗ Error testing ${endpoint}:`, error.message);
      }
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAdminAuth().then(() => {
  console.log('\n=== Test Complete ===');
}).catch(error => {
  console.error('Test error:', error);
});