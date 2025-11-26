const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const key = process.env.GEMINI_API_KEY;

async function testGemini() {
  if (!key) {
    console.error('GEMINI_API_KEY is not set.');
    process.exit(1);
  }

  console.log('GEMINI_API_KEY detected. Sending test prompt...');

  const genAI = new GoogleGenerativeAI(key);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Respond with the single word PING if you can read this.');
    const text = await result.response.text();
    console.log('Gemini response:', text.trim());
  } catch (err) {
    console.error('Gemini API error:', err?.message || err);
    process.exit(1);
  }
}

testGemini();

