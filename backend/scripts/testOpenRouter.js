const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testOpenRouter() {
  if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY is not set in .env file');
    process.exit(1);
  }

  console.log('🔑 API Key found (first 10 chars):', OPENROUTER_API_KEY.substring(0, 10) + '...');
  console.log('📡 Testing OpenRouter API connection...\n');

  // Test 1: List available models
  try {
    console.log('Test 1: Fetching available models...');
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
    });

    if (!modelsResponse.ok) {
      const errorText = await modelsResponse.text();
      console.error('❌ Failed to fetch models:', modelsResponse.status, modelsResponse.statusText);
      console.error('Error details:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message === 'User not found.') {
          console.error('\n⚠️  The API key appears to be invalid or the account does not exist.');
          console.error('Please check:');
          console.error('  1. Is the API key correct?');
          console.error('  2. Does the OpenRouter account exist?');
          console.error('  3. Has the API key been regenerated?');
        }
      } catch {}
      
      process.exit(1);
    }

    const modelsData = await modelsResponse.json();
    console.log('✅ API key is valid!');
    
    // Find Nova models
    const novaModels = modelsData.data?.filter(m => 
      m.id?.toLowerCase().includes('nova') || 
      m.name?.toLowerCase().includes('nova')
    ) || [];
    
    if (novaModels.length > 0) {
      console.log('\n📋 Available Nova models:');
      novaModels.forEach(m => {
        console.log(`   - ${m.id} (${m.name || 'N/A'})`);
      });
    } else {
      console.log('\n⚠️  No Nova models found. Available models:');
      modelsData.data?.slice(0, 10).forEach(m => {
        console.log(`   - ${m.id}`);
      });
    }
  } catch (err) {
    console.error('❌ Error fetching models:', err.message);
    process.exit(1);
  }

  // Test 2: Try a simple chat completion
  console.log('\nTest 2: Testing chat completion with amazon/nova-2-lite-v1...');
  try {
    const chatResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'amazon/nova-2-lite-v1',
        messages: [
          {
            role: 'user',
            content: 'Say "PING" if you can read this.',
          },
        ],
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ Chat completion failed:', chatResponse.status, chatResponse.statusText);
      console.error('Error:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          console.error('Error message:', errorData.error.message);
          if (errorData.error.message.includes('model') || errorData.error.message.includes('not found')) {
            console.error('\n💡 The model identifier might be wrong. Try checking OpenRouter docs for correct model names.');
          }
        }
      } catch {}
    } else {
      const chatData = await chatResponse.json();
      const content = chatData.choices[0]?.message?.content || '';
      console.log('✅ Chat completion successful!');
      console.log('Response:', content.trim());
    }
  } catch (err) {
    console.error('❌ Error in chat completion:', err.message);
  }
}

testOpenRouter().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

