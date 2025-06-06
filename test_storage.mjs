import { storage } from './server/storage.js';

async function testUser() {
  try {
    console.log('Testing storage.getUser...');
    const user = await storage.getUser('local-dev-user');
    console.log('User object returned:', JSON.stringify(user, null, 2));
    
    // Test the specific properties that auth is looking for
    console.log('user.firstName:', user.firstName);
    console.log('user.first_name:', user.first_name);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testUser(); 