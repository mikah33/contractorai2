// Test script for Saul expense recording
// This simulates a user saying "I spent $80 on lumber"

const SUPABASE_URL = 'https://mbrrtlltuubdppfrvdiq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icnJ0bGx0dXViZHBwZnJ2ZGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNTQwNTIsImV4cCI6MjA1MTkzMDA1Mn0.RqdA4GvUn4ckJT-i6E8yJmJv2GWQHZj2fNDPFWtBxSU';

async function testSaulExpense() {
  console.log('🧪 Testing Saul expense recording...\n');

  const testMessage = "I spent $80 on lumber";
  console.log(`📝 Test message: "${testMessage}"\n`);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/saul-finance-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: testMessage,
        messages: [
          { role: 'user', content: testMessage }
        ],
        financialContext: {
          currentMonth: {
            revenue: 0,
            expenses: 0,
            profit: 0
          },
          recentTransactions: [],
          budgets: []
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Edge Function error:', response.status, error);
      return;
    }

    const data = await response.json();
    console.log('✅ Response received:\n');
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.functionCalls && data.functionCalls.length > 0) {
      console.log('\n🎯 FUNCTION CALLED:', data.functionCalls[0].name);
      console.log('Arguments:', JSON.stringify(data.functionCalls[0].arguments, null, 2));
    } else {
      console.log('\n⚠️  NO FUNCTION CALLED - this is the problem!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSaulExpense();
