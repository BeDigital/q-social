import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testCSRF() {
  try {
    console.log('1. Testing GET request (should succeed)...');
    const getResponse = await axios.get(`${API_URL}/test`);
    console.log('✓ GET request successful');
    console.log('CSRF Token Cookie:', getResponse.headers['set-cookie']);

    // Extract CSRF token from cookie
    const csrfToken = getResponse.headers['set-cookie']
      ?.find(cookie => cookie.includes('XSRF-TOKEN'))
      ?.split(';')[0]
      ?.split('=')[1];

    console.log('\n2. Testing POST without CSRF token (should fail)...');
    try {
      await axios.post(`${API_URL}/test`, { data: 'test' });
      console.log('✗ POST request succeeded when it should have failed');
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log('✓ POST request correctly rejected without CSRF token');
      } else {
        throw error;
      }
    }

    console.log('\n3. Testing POST with CSRF token in X-CSRF-TOKEN header...');
    const postResponse1 = await axios.post(
      `${API_URL}/test`,
      { data: 'test' },
      {
        headers: {
          'X-CSRF-TOKEN': csrfToken
        },
        withCredentials: true
      }
    );
    console.log('✓ POST request with X-CSRF-TOKEN successful');

    console.log('\n4. Testing POST with CSRF token in X-XSRF-TOKEN header...');
    const postResponse2 = await axios.post(
      `${API_URL}/test`,
      { data: 'test' },
      {
        headers: {
          'X-XSRF-TOKEN': csrfToken
        },
        withCredentials: true
      }
    );
    console.log('✓ POST request with X-XSRF-TOKEN successful');

    console.log('\n5. Testing POST with CSRF token in form field...');
    const postResponse3 = await axios.post(
      `${API_URL}/test`,
      { 
        _csrf: csrfToken,
        data: 'test'
      },
      { withCredentials: true }
    );
    console.log('✓ POST request with form field token successful');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
testCSRF();
