// Simple test script to test broadcast notifications
// Run with: node test-broadcast.js

const fetch = require('node-fetch');

const SERVER_URL = 'http://192.168.1.175:8085';

async function testBroadcast() {
  try {
    console.log('🧪 Testing broadcast notification...');
    
    const response = await fetch(`${SERVER_URL}/api/notifications/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Broadcast 📢',
        body: 'This is a test broadcast notification to all users!',
        data: {
          screen: 'FeedScreen',
          testData: 'broadcast-test'
        },
        targetType: 'all',
        sound: 'default',
        priority: 'high'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Broadcast sent successfully!');
      console.log('📊 Results:', {
        totalTokens: result.data.totalTokens,
        successfulSends: result.data.successfulSends,
        failedSends: result.data.failedSends,
        errors: result.data.errors
      });
    } else {
      console.error('❌ Broadcast failed:', result.message);
      if (result.errors) {
        console.error('Errors:', result.errors);
      }
    }
  } catch (error) {
    console.error('❌ Error testing broadcast:', error.message);
  }
}

async function getStats() {
  try {
    console.log('📊 Getting notification stats...');
    
    const response = await fetch(`${SERVER_URL}/api/notifications/stats`);
    const result = await response.json();
    
    if (result.success) {
      console.log('📈 Notification Statistics:');
      console.log('- Total Active Tokens:', result.data.totalActive);
      console.log('- Total Inactive Tokens:', result.data.totalInactive);
      console.log('- By Platform:', result.data.byPlatform);
    } else {
      console.error('❌ Failed to get stats:', result.message);
    }
  } catch (error) {
    console.error('❌ Error getting stats:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting notification tests...\n');
  
  await getStats();
  console.log('\n');
  await testBroadcast();
  
  console.log('\n✅ Tests completed!');
}

runTests(); 