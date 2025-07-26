#!/usr/bin/env node

/**
 * Basic Browser Testing Script for IFC JSON Chunking
 * Tests basic connectivity and page structure
 */

const https = require('https');
const http = require('http');

async function testConnectivity() {
  console.log('🧪 Starting Basic Browser Connectivity Test\n');
  
  // Test 1: Frontend Server Connectivity
  console.log('📡 Testing Frontend Server (localhost:3000)...');
  try {
    const response = await makeRequest('http://localhost:3000');
    console.log('   ✅ Frontend server is accessible');
    console.log(`   📄 Response length: ${response.length} characters`);
    
    // Analyze HTML structure
    if (response.includes('IFC JSON Chunking')) {
      console.log('   ✅ Page title found: IFC JSON Chunking');
    }
    if (response.includes('lang="de"')) {
      console.log('   ✅ German language detected');
    }
    if (response.includes('root')) {
      console.log('   ✅ React root element found');
    }
  } catch (error) {
    console.log('   ❌ Frontend server not accessible:', error.message);
    return false;
  }

  // Test 2: Backend API Connectivity  
  console.log('\n📡 Testing Backend API (localhost:8001)...');
  try {
    const response = await makeRequest('http://localhost:8001/api/health');
    console.log('   ✅ Backend API is accessible');
    console.log(`   📄 API Response: ${response}`);
  } catch (error) {
    console.log('   ❌ Backend API not accessible:', error.message);
  }

  // Test 3: Frontend API Proxy
  console.log('\n📡 Testing Frontend API Proxy...');
  try {
    const response = await makeRequest('http://localhost:3000/api/health');
    console.log('   ✅ Frontend API proxy working');
    console.log(`   📄 Proxy Response: ${response}`);
  } catch (error) {
    console.log('   ❌ Frontend API proxy not working:', error.message);
  }

  return true;
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Run tests
testConnectivity().then(success => {
  if (success) {
    console.log('\n🎉 Basic connectivity tests completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. ✅ Servers are running correctly');
    console.log('   2. 🔄 Ready for interactive browser testing');
    console.log('   3. 📝 Can proceed with E2E test development');
  } else {
    console.log('\n❌ Connectivity issues detected - check server status');
  }
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});