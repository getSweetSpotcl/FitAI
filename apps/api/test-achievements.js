// Simple test script for achievements endpoints
// Run with: node test-achievements.js

const BASE_URL = 'http://localhost:8787/api/v1/social';

// Test user token (replace with actual dev token)
const TEST_TOKEN = 'dev-token-123';

async function testAchievements() {
  try {
    console.log('🧪 Testing Achievements Endpoints\n');
    
    // Test 1: Get all achievements
    console.log('1️⃣ Testing GET /achievements/all');
    const allResponse = await fetch(`${BASE_URL}/achievements/all`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (allResponse.ok) {
      const allData = await allResponse.json();
      console.log('✅ All achievements:', allData.data.length, 'total');
      console.log('   Sample:', allData.data[0]?.name_es || 'No achievements found');
    } else {
      console.log('❌ Failed to get all achievements:', allResponse.status);
    }
    
    console.log('');
    
    // Test 2: Get user achievements
    console.log('2️⃣ Testing GET /achievements');
    const userResponse = await fetch(`${BASE_URL}/achievements`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User achievements:');
      console.log('   Earned:', userData.data.earned.length);
      console.log('   Available:', userData.data.available.length);
      console.log('   Total Points:', userData.data.stats.totalPoints);
      console.log('   Completion Rate:', userData.data.stats.completionRate + '%');
    } else {
      console.log('❌ Failed to get user achievements:', userResponse.status);
      const errorData = await userResponse.text();
      console.log('   Error:', errorData);
    }
    
    console.log('');
    
    // Test 3: Check for new achievements
    console.log('3️⃣ Testing POST /achievements/check');
    const checkResponse = await fetch(`${BASE_URL}/achievements/check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      console.log('✅ Achievement check:', checkData.message);
      console.log('   New achievements:', checkData.data.count);
    } else {
      console.log('❌ Failed to check achievements:', checkResponse.status);
    }
    
  } catch (error) {
    console.error('🚨 Test error:', error.message);
  }
}

// Run the tests
testAchievements();