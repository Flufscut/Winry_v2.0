#!/usr/bin/env node

/**
 * Comprehensive Prospect Upload Test
 * Tests the complete workflow from login to prospect upload to n8n processing
 */

const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

const BASE_URL = 'https://winrybysl-production.up.railway.app';

// Test configuration
const TEST_CONFIG = {
  email: 'developer@example.com',
  password: 'testpassword123',
  csvFile: 'test_prospect.csv'
};

console.log('🧪 COMPREHENSIVE PROSPECT UPLOAD TEST');
console.log('=====================================');
console.log(`🌐 Testing: ${BASE_URL}`);
console.log(`📧 Email: ${TEST_CONFIG.email}`);
console.log(`📄 CSV File: ${TEST_CONFIG.csvFile}`);
console.log('');

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      if (data instanceof FormData) {
        data.pipe(req);
      } else {
        req.write(data);
        req.end();
      }
    } else {
      req.end();
    }
  });
}

async function testHealthEndpoint() {
  console.log('🏥 Testing Health Endpoint...');
  try {
    const response = await makeRequest({
      hostname: 'winrybysl-production.up.railway.app',
      path: '/api/health',
      method: 'GET'
    });
    
    console.log(`   Status: ${response.statusCode}`);
    if (response.statusCode === 200) {
      const health = JSON.parse(response.body);
      console.log(`   ✅ Health: ${health.status}`);
      console.log(`   🕐 Timestamp: ${health.timestamp}`);
      return true;
    } else {
      console.log(`   ❌ Health check failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Health check error: ${error.message}`);
    return false;
  }
}

async function testLoginEndpoint() {
  console.log('🔐 Testing Login Endpoint...');
  try {
    const loginData = JSON.stringify({
      email: TEST_CONFIG.email,
      password: TEST_CONFIG.password
    });

    const response = await makeRequest({
      hostname: 'winrybysl-production.up.railway.app',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Headers: ${JSON.stringify(response.headers, null, 2)}`);
    
    if (response.statusCode === 200) {
      console.log(`   ✅ Login successful`);
      return response.headers['set-cookie'];
    } else {
      console.log(`   ❌ Login failed: ${response.statusCode}`);
      console.log(`   Response: ${response.body}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Login error: ${error.message}`);
    return null;
  }
}

async function testCsvUpload(cookies) {
  console.log('📄 Testing CSV Upload...');
  
  if (!fs.existsSync(TEST_CONFIG.csvFile)) {
    console.log(`   ❌ CSV file not found: ${TEST_CONFIG.csvFile}`);
    return false;
  }

  try {
    const form = new FormData();
    form.append('csvFile', fs.createReadStream(TEST_CONFIG.csvFile));

    const response = await makeRequest({
      hostname: 'winrybysl-production.up.railway.app',
      path: '/api/upload-csv',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Cookie': cookies ? cookies.join('; ') : ''
      }
    }, form);
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${response.body.substring(0, 500)}...`);
    
    if (response.statusCode === 200) {
      console.log(`   ✅ CSV upload successful`);
      return true;
    } else {
      console.log(`   ❌ CSV upload failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ CSV upload error: ${error.message}`);
    return false;
  }
}

async function testProspectsEndpoint(cookies) {
  console.log('👥 Testing Prospects Endpoint...');
  try {
    const response = await makeRequest({
      hostname: 'winrybysl-production.up.railway.app',
      path: '/api/prospects',
      method: 'GET',
      headers: {
        'Cookie': cookies ? cookies.join('; ') : ''
      }
    });
    
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const prospects = JSON.parse(response.body);
      console.log(`   ✅ Found ${prospects.length} prospects`);
      
      if (prospects.length > 0) {
        const latest = prospects[0];
        console.log(`   📊 Latest prospect: ${latest.firstName} ${latest.lastName} (${latest.status})`);
        if (latest.n8nExecutionId) {
          console.log(`   🔗 n8n Execution ID: ${latest.n8nExecutionId}`);
        }
      }
      return prospects;
    } else {
      console.log(`   ❌ Prospects fetch failed: ${response.statusCode}`);
      console.log(`   Response: ${response.body}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Prospects error: ${error.message}`);
    return null;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Test...\n');
  
  // Step 1: Health Check
  const healthOk = await testHealthEndpoint();
  if (!healthOk) {
    console.log('❌ Health check failed, aborting test');
    return;
  }
  console.log('');
  
  // Step 2: Login Test
  const cookies = await testLoginEndpoint();
  if (!cookies) {
    console.log('❌ Login failed, aborting test');
    return;
  }
  console.log('');
  
  // Step 3: CSV Upload Test
  const uploadOk = await testCsvUpload(cookies);
  if (!uploadOk) {
    console.log('❌ CSV upload failed');
  }
  console.log('');
  
  // Step 4: Check Prospects
  const prospects = await testProspectsEndpoint(cookies);
  console.log('');
  
  // Summary
  console.log('📋 TEST SUMMARY');
  console.log('===============');
  console.log(`✅ Health Check: ${healthOk ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Login: ${cookies ? 'PASS' : 'FAIL'}`);
  console.log(`✅ CSV Upload: ${uploadOk ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Prospects: ${prospects ? `PASS (${prospects.length} found)` : 'FAIL'}`);
  
  if (prospects && prospects.length > 0) {
    console.log('\n🔍 PROSPECT ANALYSIS');
    console.log('===================');
    prospects.slice(0, 3).forEach((p, i) => {
      console.log(`${i + 1}. ${p.firstName} ${p.lastName} - ${p.status}`);
      if (p.n8nExecutionId) console.log(`   🔗 n8n: ${p.n8nExecutionId}`);
      if (p.researchResults) console.log(`   📊 Research: Available`);
    });
  }
}

// Run the test
runComprehensiveTest().catch(console.error); 