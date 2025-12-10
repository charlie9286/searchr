// Commented out Gemini test - using OpenRouter instead
// const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// const key = process.env.GEMINI_API_KEY; // Commented out

// OpenRouter API test
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'x-ai/grok-4.1-fast';

async function testOpenRouter() {
  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }

  console.log('OPENROUTER_API_KEY detected. Sending test prompt...');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: 'Respond with the single word PING if you can read this.',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    console.log('OpenRouter response:', text.trim());
  } catch (err) {
    console.error('OpenRouter API error:', err?.message || err);
    process.exit(1);
  }
}

// Commented out Gemini test
// async function testGemini() {
//   if (!key) {
//     console.error('GEMINI_API_KEY is not set.');
//     process.exit(1);
//   }
//
//   console.log('GEMINI_API_KEY detected. Sending test prompt...');
//
//   const genAI = new GoogleGenerativeAI(key);
//
//   try {
//     const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
//     const result = await model.generateContent('Respond with the single word PING if you can read this.');
//     const text = await result.response.text();
//     console.log('Gemini response:', text.trim());
//   } catch (err) {
//     console.error('Gemini API error:', err?.message || err);
//     process.exit(1);
//   }
// }

testOpenRouter();

