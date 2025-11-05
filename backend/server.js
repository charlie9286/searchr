const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const WordSearchGenerator = require('./wordSearchGenerator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-api-key-here');

// Word Search Generation API
// POST /api/wordsearch/generate
app.post('/api/wordsearch/generate', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || topic.trim().length < 3) {
      return res.status(400).json({ error: 'Topic must be at least 3 characters' });
    }

    // Get Gemini model - try gemini-2.0-flash-exp first, fallback to gemini-1.5-flash
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      console.log('Using model: gemini-2.0-flash-exp');
    } catch (err) {
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('Using model: gemini-1.5-flash (fallback)');
      } catch (err2) {
        console.error('Failed to initialize any Gemini model:', err2.message);
        throw new Error('Gemini API not available. Please check your API key.');
      }
    }
    
    const prompt = `Generate words for a word search puzzle about the topic: "${topic}".

Follow these rules EXACTLY:

GOAL:

Return UP TO 12 single words that are clearly related to "${topic}". Generate as many relevant words as possible, but don't force it if the topic is too narrow.

FORMAT:

Return ONLY valid JSON (no markdown, no comments, no explanations).

Structure:
{"words": ["WORD1","WORD2","WORD3",...]}

HARD CONSTRAINTS:

Words must be UPPERCASE A–Z, 3–8 letters each.

No duplicates. No hyphens, spaces, numbers, or punctuation.

All words must be directly related to the topic (see strategy below).

STRATEGY TO GENERATE RELEVANT WORDS:
A) Normalize the topic:

Trim whitespace. If not English, translate to English internally.

If the topic is multi-word (e.g., "quantum entanglement", "New York pizza"), extract the core concept(s).
B) Build a candidate pool:

Start with direct synonyms, key terms, tools, parts, actions, subtypes, and famous short terms linked to the topic.

Add immediate broader and narrower concepts (hypernyms/hyponyms) that remain clearly connected.

Prefer shorter canonical forms (e.g., "VIOLIN" not "VIOLINS" if length is an issue).
C) Enforce the 3–8 letter limit:

If a great term is too long, choose a closely related shorter term (e.g., "ENTROPY" instead of "THERMAL").
D) Quality over quantity:

It's better to have 6 highly relevant words than 12 loosely related ones.

If you can only find 3-5 truly relevant words, that's perfectly fine.

Do NOT add generic or loosely related words just to reach 12.
E) Final validation checklist (must pass for ALL words):

Related to topic? YES

3–8 letters? YES

Uppercase A–Z only? YES

No duplicates/hyphens/spaces? YES`;

    let words = [];
    try {
      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      console.log('Gemini word search response:', text.substring(0, 300));
      
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const payload = JSON.parse(jsonMatch[0]);
        words = payload.words || [];
        console.log('Parsed words:', words.length, words);
      } else {
        // Try to find words in the text even if not in JSON format
        const wordMatches = text.match(/\b[A-Z]{3,8}\b/g);
        if (wordMatches && wordMatches.length > 0) {
          words = wordMatches.slice(0, 12); // Limit to max 12 but don't require 12
          console.log('Extracted words from text:', words);
        }
      }
      
      // Validate that we have at least some words
      if (!words || words.length === 0) {
        throw new Error('No words found in response');
      }
      
      // Filter to valid words (3-8 letters, uppercase) and limit to 12 max
      words = words.filter(w => {
        const word = String(w).toUpperCase().trim();
        return word.length >= 3 && word.length <= 8 && /^[A-Z]+$/.test(word);
      }).slice(0, 12).map(w => String(w).toUpperCase().trim());
      
      // Accept any number of words from 1 to 12
      if (words.length === 0) {
        throw new Error('No valid words found after filtering');
      }
      
      console.log(`Successfully generated ${words.length} words for topic: ${topic}`);
      
    } catch (e) {
      console.error('Gemini API error:', e.message);
      console.error('Full error:', e);
      
      // Provide a helpful error message
      const errorMsg = e.message?.includes('404') || e.message?.includes('not found') 
        ? 'Gemini API model not available. Please check your API key configuration.'
        : `Failed to generate topic-related words: ${e.message}. Please try again or use a different topic.`;
      
      return res.status(500).json({ 
        error: errorMsg
      });
    }

    const generator = new WordSearchGenerator(15);
    const { grid, placements } = generator.generate(words);

    res.json({ grid, words, placements, topic });
  } catch (err) {
    console.error('Error generating word search:', err);
    res.status(500).json({ error: 'Failed to generate word search' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

