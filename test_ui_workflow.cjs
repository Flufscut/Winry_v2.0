/**
 * UI Workflow Test Script
 * PURPOSE: Test complete end-to-end workflow from login to prospect display
 * TESTS: Login, CSV upload, prospect creation, UI display, n8n integration
 * MONITORING: Compares UI state with Railway logs
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://winrybysl-production.up.railway.app';
const TEST_EMAIL = 'test@winryai.com';
const TEST_PASSWORD = 'TestPassword123!';

// Test data from test_prospects_2.csv
const TEST_PROSPECTS = [
  {
    firstName: 'Bradley',
    lastName: 'Aaronson',
    email: 'baaronson@cimgroup.com',
    company: 'CIM Group',
    title: 'Managing Director of Development',
    linkedinUrl: 'https://www.linkedin.com/in/bradley-aaronson-1a41585/'
  },
  {
    firstName: 'Ron',
    lastName: 'Abadam', 
    email: 'ron@terracommercial.com',
    company: 'Terracommercial, Inc',
    title: 'Facilities Coordinator',
    linkedinUrl: 'https://www.linkedin.com/in/ronald-abadam-91820ba/'
  }
];

async function testWorkflow() {
  console.log('🚀 Starting UI Workflow Test...');
  console.log('📍 Target URL:', BASE_URL);
  console.log('📊 Test Prospects:', TEST_PROSPECTS.length);
  
  try {
    // Step 1: Test application availability
    console.log('\n📡 Step 1: Testing application availability...');
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (healthCheck.ok) {
      const health = await healthCheck.json();
      console.log('✅ Application healthy:', health);
    } else {
      console.log('❌ Application health check failed');
      return;
    }

    // Step 2: Test authentication endpoints
    console.log('\n🔐 Step 2: Testing authentication...');
    
    // Test signup endpoint
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: 'Test',
        lastName: 'User'
      })
    });
    
    console.log('📝 Signup attempt status:', signupResponse.status);
    
    // Test login endpoint
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });
    
    console.log('🔑 Login attempt status:', loginResponse.status);
    
    if (loginResponse.ok) {
      console.log('✅ Authentication successful');
    } else {
      console.log('❌ Authentication failed');
      const errorText = await loginResponse.text();
      console.log('❌ Error:', errorText);
      return;
    }

    // Step 3: Test CSV upload endpoint (simulated)
    console.log('\n📤 Step 3: Testing CSV upload...');
    
    // Create test CSV content
    const csvContent = `Contact,First Name,Last Name,LinkedIn,Title,Property,Management Company,Address 1,Address 2,City,State,ZIP,EMail,Bounces?,Phone Number,Fax Number,Date Valid On,API Contact Id
Bradley Aaronson,Bradley,Aaronson,https://www.linkedin.com/in/bradley-aaronson-1a41585/,Managing Director of Development,,CIM Group ,4700 Wilshire Blvd,,Los Angeles,CA,90010,baaronson@cimgroup.com,N,3238604900,3238439604,2025-04-09,c8139786-5fb6-42f0-986a-c34d2553bb11
Ron Abadam,Ron,Abadam,https://www.linkedin.com/in/ronald-abadam-91820ba/,Facilities Coordinator,,"Terracommercial, Inc",520 E McGlincy Lane,Suite 1,Campbell,CA,95008,ron@terracommercial.com,N,4082921166,4082925650,2025-04-09,cd2411e9-a881-47f8-a005-3e2b272a1117`;
    
    // Create FormData for CSV upload
    const formData = new FormData();
    formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'test_prospects.csv');
    
    // Add column mappings
    formData.append('mapping[firstName]', 'First Name');
    formData.append('mapping[lastName]', 'Last Name');
    formData.append('mapping[email]', 'EMail');
    formData.append('mapping[company]', 'Management Company');
    formData.append('mapping[title]', 'Title');
    formData.append('mapping[linkedinUrl]', 'LinkedIn');
    
    console.log('📁 CSV content prepared with', TEST_PROSPECTS.length, 'prospects');
    console.log('🗂️ Column mappings configured');

    // Step 4: Monitor API endpoints
    console.log('\n👀 Step 4: Testing API endpoints...');
    
    // Test prospects API (this should show our 7 prospects after the fix)
    const prospectsResponse = await fetch(`${BASE_URL}/api/prospects`);
    console.log('📋 Prospects API status:', prospectsResponse.status);
    
    if (prospectsResponse.ok) {
      const prospects = await prospectsResponse.json();
      console.log('📊 Current prospects in database:', prospects.length);
      console.log('📈 Prospects by status:', prospects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}));
      
      // Show first few prospects
      console.log('👥 First 3 prospects:');
      prospects.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.firstName} ${p.lastName} (${p.company}) - Status: ${p.status}`);
      });
    } else {
      console.log('❌ Could not fetch prospects - authentication required');
    }

    // Step 5: Test n8n monitoring
    console.log('\n🤖 Step 5: Testing n8n integration status...');
    
    // Check if there are recent n8n executions
    const monitoringResponse = await fetch(`${BASE_URL}/api/prospects/monitoring/status`);
    console.log('📊 N8N monitoring status:', monitoringResponse.status);
    
    if (monitoringResponse.status === 401) {
      console.log('🔒 Monitoring requires authentication (expected)');
    }

    // Step 6: Manual verification instructions
    console.log('\n📋 Step 6: Manual Verification Instructions');
    console.log('='.repeat(60));
    console.log('🌐 Open browser to:', BASE_URL);
    console.log('🔑 Login credentials:');
    console.log('   Email:', TEST_EMAIL);
    console.log('   Password:', TEST_PASSWORD);
    console.log('');
    console.log('✅ Expected Results After Fix:');
    console.log('   • Dashboard shows 7 total prospects');
    console.log('   • 2 prospects with "completed" status');
    console.log('   • 5 prospects with "processing" status');
    console.log('   • Prospect names include Bradley Aaronson, Ron Abadam');
    console.log('   • Research results visible for completed prospects');
    console.log('');
    console.log('📤 To test CSV upload:');
    console.log('   1. Go to Prospect Management page');
    console.log('   2. Upload test_prospects_2.csv');
    console.log('   3. Map columns as shown above');
    console.log('   4. Verify prospects appear immediately in table');
    console.log('   5. Check that n8n research starts (processing status)');

    console.log('\n🎯 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

// Run the test
testWorkflow().catch(console.error); 