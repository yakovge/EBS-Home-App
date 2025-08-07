/**
 * Simple test script to verify Flask backend connectivity
 * Run this to ensure the backend is accessible before running the mobile app
 */

const API_BASE_URL = 'http://localhost:5000';

async function testBackendConnectivity() {
  console.log('🔍 Testing Flask Backend Connectivity...');
  console.log(`Base URL: ${API_BASE_URL}`);
  
  const tests = [
    {
      name: 'Health Check',
      endpoint: '/health',
      method: 'GET'
    },
    {
      name: 'API Test Endpoint',
      endpoint: '/api/test',
      method: 'GET'
    },
    {
      name: 'API OPTIONS (CORS)',
      endpoint: '/api/auth/login',
      method: 'OPTIONS'
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`);
      const response = await fetch(`${API_BASE_URL}${test.endpoint}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:8081' // Typical Expo dev server
        }
      });

      if (response.ok) {
        console.log(`✅ ${test.name}: PASSED (${response.status})`);
        
        if (test.method === 'GET') {
          try {
            const data = await response.json();
            console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
          } catch (e) {
            console.log(`   Response: [Non-JSON response]`);
          }
        }
        
        passedTests++;
      } else {
        console.log(`❌ ${test.name}: FAILED (${response.status} ${response.statusText})`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }

  console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Backend is ready for mobile app integration.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Please check backend configuration.');
    console.log('\n💡 To start the Flask backend:');
    console.log('   cd backend');
    console.log('   python -m venv venv');
    console.log('   venv\\Scripts\\activate  # Windows');
    console.log('   # source venv/bin/activate  # macOS/Linux');
    console.log('   pip install -r requirements.txt');
    console.log('   python app.py');
    return false;
  }
}

// Run the test
testBackendConnectivity()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test script error:', error);
    process.exit(1);
  });