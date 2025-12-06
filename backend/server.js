const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
// const { GoogleGenerativeAI } = require('@google/generative-ai'); // Commented out - using OpenRouter instead
const WordSearchGenerator = require('./wordSearchGenerator');
const { supabase } = require('./supabaseClient');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Word Search Generator API',
    version: '1.0.0',
    status: 'ok',
    endpoint: 'POST /api/wordsearch/generate'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize OpenRouter API (replacing Gemini)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'amazon/nova-2-lite-v1'; // OpenRouter model identifier for Amazon Nova 2 Lite

if (!OPENROUTER_API_KEY) {
  console.warn('⚠️ OPENROUTER_API_KEY is not set in environment variables');
}

// Commented out Gemini initialization
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


const PROMPT_TEMPLATE = (topic) => `Generate words for a word search puzzle about the topic: "${topic}".

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

// Commented out Gemini model generation
// async function generateModel() {
//   try {
//     const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
//     console.log('Using model: gemini-2.0-flash');
//     return model;
//   } catch (err) {
//     console.warn('Failed to load gemini-2.0-flash, falling back:', err.message);
//   }
//
//   try {
//     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
//     console.log('Using model: gemini-1.5-flash-latest (fallback)');
//     return model;
//   } catch (err) {
//     console.error('Failed to initialize any Gemini model:', err.message);
//     throw new Error('Gemini API not available. Please check your API key.');
//   }
// }

// Timeout wrapper for async operations
function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// OpenRouter API call function with timeout
async function callOpenRouter(prompt, timeoutMs = 30000) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set. Please set it in your environment variables.');
  }

  try {
    const fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wordsearch.app', // Optional: for OpenRouter analytics
        'X-Title': 'Word Search Generator', // Optional: for OpenRouter analytics
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await withTimeout(fetchPromise, timeoutMs, 'OpenRouter API request timed out');

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage += ` - ${errorData.error.message}`;
          
          // Provide helpful error messages
          if (errorData.error.message === 'User not found.') {
            errorMessage += '\n\n⚠️  This usually means:\n';
            errorMessage += '   1. The API key is invalid or expired\n';
            errorMessage += '   2. The OpenRouter account does not exist\n';
            errorMessage += '   3. The API key needs to be regenerated\n';
            errorMessage += '\nPlease check your OpenRouter account at https://openrouter.ai/keys';
          }
        } else {
          errorMessage += ` - ${errorText}`;
        }
      } catch {
        errorMessage += ` - ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    // Also timeout the JSON parsing (5 seconds should be enough)
    const data = await withTimeout(response.json(), 5000, 'OpenRouter API response parsing timed out');
    const content = data.choices[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('OpenRouter API returned empty response');
    }
    
    return content;
  } catch (err) {
    if (err.message.includes('OPENROUTER_API_KEY')) {
      throw err;
    }
    console.error('OpenRouter API call failed:', err.message);
    throw new Error(`Failed to call OpenRouter API: ${err.message}`);
  }
}

async function generateWordsForTopic(topic, timeoutMs = 30000) {
  if (!topic || topic.trim().length < 3) {
    throw new Error('Topic must be at least 3 characters');
  }

  // Commented out Gemini model call
  // const model = await generateModel();
  const prompt = PROMPT_TEMPLATE(topic);

  // Using OpenRouter API instead of Gemini (with timeout)
  const text = await callOpenRouter(prompt, timeoutMs);
  console.log('OpenRouter word search response:', text.substring(0, 300));
      
  let words = [];

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
    try {
        const payload = JSON.parse(jsonMatch[0]);
        words = payload.words || [];
        console.log('Parsed words:', words.length, words);
    } catch (err) {
      console.warn('Failed to parse JSON response, falling back to regex extraction:', err.message);
    }
  }

  if (!words || words.length === 0) {
        const wordMatches = text.match(/\b[A-Z]{3,8}\b/g);
        if (wordMatches && wordMatches.length > 0) {
      words = wordMatches.slice(0, 12);
          console.log('Extracted words from text:', words);
        }
      }
      
      if (!words || words.length === 0) {
        throw new Error('No words found in response');
      }
      
  words = words
    .map(w => String(w).toUpperCase().trim())
    .filter(word => word.length >= 3 && word.length <= 8 && /^[A-Z]+$/.test(word))
    .slice(0, 12);

      if (words.length === 0) {
        throw new Error('No valid words found after filtering');
      }
      
      console.log(`Successfully generated ${words.length} words for topic: ${topic}`);
  return words;
}

async function buildPuzzle(topic, timeoutMs = 30000) {
  const words = await generateWordsForTopic(topic, timeoutMs);
  const generator = new WordSearchGenerator(15);
  const { grid, placements } = generator.generate(words);
  return { grid, words, placements, topic };
}

const PENDING_TOPIC = '__PENDING__';

// Fallback method for when PostgreSQL function is not available
async function fallbackQuickMatch(req, res, playerId) {
  // This is the old implementation - kept as fallback
  // (Original code would go here, but keeping it simple for now)
  return res.status(500).json({ error: 'Matchmaking function not available. Please run the SQL migration.' });
}

async function selectQuickMatchTopic(recentTopics = [], timeoutMs = 30000) {
  const exclusions = recentTopics
    .map(topic => (typeof topic === 'string' ? topic.toUpperCase() : ''))
    .filter(Boolean);

  // Fallback topics if OpenRouter fails
  const fallbackTopics = [
    'ANIMALS', 'OCEAN', 'SPACE', 'FOREST', 'MOUNTAINS', 'DESERT', 'RIVERS', 'LAKES',
    'BIRDS', 'FISH', 'INSECTS', 'PLANTS', 'TREES', 'FLOWERS', 'FRUITS', 'VEGETABLES',
    'SPORTS', 'MUSIC', 'ART', 'SCIENCE', 'HISTORY', 'GEOGRAPHY', 'WEATHER', 'SEASONS'
  ];

  // Filter out recent topics from fallback
  const availableFallbacks = fallbackTopics.filter(t => !exclusions.includes(t));
  
  // Commented out Gemini model call
  // const model = await generateModel();
  const exclusionList = exclusions.length > 0
    ? exclusions.map(topic => `"${topic}"`).join(', ')
    : '[]';

  const prompt = `You are selecting a topic for a fast, family-friendly multiplayer word search puzzle.

Return EXACTLY ONE topic that follows ALL rules:

1. The topic must be:
   - 1 to 3 English words.
   - Concrete and easy to understand.
   - Suitable for a general audience (no NSFW, no politics, no religion, no brands, no celebrities).
   - Rich enough to generate at least 8 clearly related words (3–8 letters, uppercase A–Z only) for a word search.

2. Variety requirements:
   - The topic MUST NOT be any of the following recently used topics:
     [${exclusionList}]
   - Prefer topics from areas like animals, nature, space, science, food, sports, music, geography, weather, ocean, history, art.

3. Output format:
   - Return ONLY valid JSON.
   - No markdown, no comments, no explanations.
   - Structure:
     {"topic": "YOUR_TOPIC"}

Now respond with the JSON only.`;

  try {
    // Using OpenRouter API instead of Gemini (with timeout for multiplayer)
    const text = await callOpenRouter(prompt, timeoutMs);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON detected in topic response');
    }
    const payload = JSON.parse(jsonMatch[0]);
    const topic = String(payload.topic || '').trim();
    if (!topic) {
      throw new Error('Topic missing in response');
    }
    if (exclusions.includes(topic.toUpperCase())) {
      throw new Error('Returned topic repeats recent topics');
    }
    return topic.toUpperCase();
  } catch (error) {
    console.error('Quick match topic selection failed:', error?.message);
    // Use fallback topic if OpenRouter fails
    if (availableFallbacks.length > 0) {
      const randomTopic = availableFallbacks[Math.floor(Math.random() * availableFallbacks.length)];
      console.log(`Using fallback topic: ${randomTopic}`);
      return randomTopic;
    }
    // Last resort: use a default topic
    return 'ANIMALS';
  }
}

// Word Search Generation API
// POST /api/wordsearch/generate
app.post('/api/wordsearch/generate', async (req, res) => {
  try {
    const { topic } = req.body;
    const puzzle = await buildPuzzle(topic);
    res.json(puzzle);
  } catch (err) {
    console.error('Error generating word search:', err);
    // Ensure we always return JSON, not HTML
    const errorMessage = err?.message || 'Failed to generate word search';
    // Strip any HTML from error messages
    const cleanMessage = errorMessage.replace(/<[^>]*>/g, '').trim() || 'Failed to generate word search';
    res.status(500).json({ error: cleanMessage });
  }
});

// Matchmaking API for multiplayer
// POST /api/matchmaking
app.post('/api/matchmaking', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not configured on server' });
    }

    const { playerId, topic } = req.body || {};

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'playerId is required' });
    }

    if (!topic || topic.trim().length < 3) {
      return res.status(400).json({ error: 'Topic must be at least 3 characters' });
    }

    const trimmedTopic = topic.trim();

    // Try to find an existing waiting match with the same topic
    const { data: waitingMatches, error: findErr } = await supabase
      .from('matches')
      .select('id, grid, words, placements, topic')
      .eq('status', 'waiting')
      .eq('topic', trimmedTopic)
      .limit(1);

    if (findErr) {
      console.error('Supabase find waiting match error:', findErr);
      return res.status(500).json({ error: findErr.message });
    }

    let matchRecord;

    if (waitingMatches && waitingMatches.length > 0) {
      matchRecord = waitingMatches[0];

      const { error: joinErr } = await supabase
        .from('match_players')
        .insert({
          match_id: matchRecord.id,
          player_id: playerId,
        });

      if (joinErr) {
        console.error('Supabase join match error:', joinErr);
        return res.status(500).json({ error: joinErr.message });
      }

      const { error: activateErr } = await supabase
        .from('matches')
        .update({ status: 'active' })
        .eq('id', matchRecord.id);

      if (activateErr) {
        console.error('Supabase activate match error:', activateErr);
        return res.status(500).json({ error: activateErr.message });
      }

      return res.status(200).json({
        matchId: matchRecord.id,
        topic: matchRecord.topic,
        grid: matchRecord.grid,
        words: matchRecord.words,
        placements: matchRecord.placements,
        status: 'active',
        joinedAs: 'player2',
      });
    }

    // Otherwise, create a new match and mark it as waiting
    const puzzle = await buildPuzzle(trimmedTopic);
    const puzzleId = puzzle.puzzleId || crypto.randomUUID();

    const { data: newMatch, error: insertErr } = await supabase
      .from('matches')
      .insert({
        topic: trimmedTopic,
        puzzle_id: puzzleId,
        grid: puzzle.grid,
        words: puzzle.words,
        placements: puzzle.placements,
        status: 'waiting',
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Supabase create match error:', insertErr);
      return res.status(500).json({ error: insertErr.message });
    }

    const { error: registerErr } = await supabase
      .from('match_players')
      .insert({
        match_id: newMatch.id,
        player_id: playerId,
      });

    if (registerErr) {
      console.error('Supabase register player error:', registerErr);
      return res.status(500).json({ error: registerErr.message });
    }

    return res.status(200).json({
      matchId: newMatch.id,
      topic: newMatch.topic,
      grid: newMatch.grid,
      words: newMatch.words,
      placements: newMatch.placements,
      status: 'waiting',
      joinedAs: 'player1',
    });
  } catch (err) {
    console.error('Matchmaking error:', err);
    res.status(500).json({ error: err.message || 'Matchmaking failed' });
  }
});

// Multiplayer Quick Match API
// POST /api/multiplayer/quickmatch
// Uses PostgreSQL function with FOR UPDATE SKIP LOCKED for atomic matchmaking
app.post('/api/multiplayer/quickmatch', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not configured on server' });
    }

    const { playerId } = req.body || {};

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'playerId is required' });
    }

    // Convert playerId to UUID format if needed (Supabase expects UUID)
    let userId;
    try {
      // Try to use as UUID directly
      userId = playerId;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid playerId format' });
    }

    // Call PostgreSQL function for atomic matchmaking
    // This function uses FOR UPDATE SKIP LOCKED to prevent race conditions
    const { data: matchResult, error: rpcError } = await supabase.rpc('find_or_create_match', {
      p_user_id: userId,
      p_desired_max_players: 2
    });

    if (rpcError) {
      // If function doesn't exist, fall back to old method
      if (rpcError.message?.includes('function') || rpcError.code === '42883') {
        console.warn('PostgreSQL function not found, falling back to old matchmaking method');
        return await fallbackQuickMatch(req, res, playerId);
      }
      console.error('Supabase RPC error:', rpcError);
      return res.status(500).json({ error: rpcError.message || 'Matchmaking failed' });
    }

    if (!matchResult || matchResult.length === 0) {
      return res.status(500).json({ error: 'Matchmaking function returned no result' });
    }

    const result = matchResult[0];
    const matchId = result.match_id;
    const joinedAs = result.joined_as;
    const matchStatus = result.match_status;

    // If match is in_progress, we need to generate/retrieve the puzzle
    if (matchStatus === 'in_progress') {
      // Check if puzzle already exists
      const { data: existingMatch, error: matchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchErr) {
        console.error('Error fetching match:', matchErr);
        return res.status(500).json({ error: matchErr.message });
      }

      // If puzzle not generated yet, generate it
      if (!existingMatch.topic || existingMatch.topic === PENDING_TOPIC || !existingMatch.grid || existingMatch.grid.length === 0) {
        try {
          // Set status to 'generating' to prevent duplicate generation
          await supabase
            .from('matches')
            .update({ status: 'generating' })
            .eq('id', matchId)
            .eq('status', 'in_progress');

          // Get recent topics to avoid duplicates
          const { data: recentTopicsData } = await supabase
            .from('matches')
            .select('topic')
            .order('created_at', { ascending: false })
            .limit(50);

          const recentTopics = (recentTopicsData || [])
            .map(row => row.topic)
            .filter(topic => topic && topic !== PENDING_TOPIC);

          // Generate puzzle with shorter timeout for multiplayer
          const topic = await selectQuickMatchTopic(recentTopics, 15000);
          const puzzle = await buildPuzzle(topic, 15000);
          const puzzleId = existingMatch.puzzle_id || puzzle.puzzleId || crypto.randomUUID();

          // Atomic update: only update if still in 'generating' or 'in_progress'
          const { data: updatedMatch, error: updateErr } = await supabase
            .from('matches')
            .update({
              topic,
              puzzle_id: puzzleId,
              grid: puzzle.grid,
              words: puzzle.words,
              placements: puzzle.placements,
              status: 'active',
            })
            .eq('id', matchId)
            .in('status', ['generating', 'in_progress'])
            .select()
            .single();

          if (updateErr || !updatedMatch) {
            // Another player may have already generated the puzzle
            const { data: activeMatch } = await supabase
              .from('matches')
              .select('*')
              .eq('id', matchId)
              .single();

            if (activeMatch && activeMatch.status === 'active') {
              return res.status(200).json({
                matchId: activeMatch.id,
                topic: activeMatch.topic,
                grid: activeMatch.grid || [],
                words: activeMatch.words || [],
                placements: activeMatch.placements || [],
                status: 'active',
                joinedAs,
              });
            }
          } else {
            return res.status(200).json({
              matchId: updatedMatch.id,
              topic,
              grid: puzzle.grid,
              words: puzzle.words,
              placements: puzzle.placements,
              status: 'active',
              joinedAs,
            });
          }
        } catch (puzzleErr) {
          console.error('Error generating puzzle:', puzzleErr);
          // Reset match status if puzzle generation failed
          await supabase
            .from('matches')
            .update({ status: 'waiting' })
            .eq('id', matchId)
            .eq('status', 'generating');
          throw puzzleErr;
        }
      } else {
        // Puzzle already exists
        return res.status(200).json({
          matchId: existingMatch.id,
          topic: existingMatch.topic === PENDING_TOPIC ? null : existingMatch.topic,
          grid: existingMatch.grid || [],
          words: existingMatch.words || [],
          placements: existingMatch.placements || [],
          status: existingMatch.status,
          joinedAs,
        });
      }
    }

    // Match is still waiting
    return res.status(200).json({
      matchId,
      topic: null,
      grid: [],
      words: [],
      placements: [],
      status: 'waiting',
      joinedAs,
    });
  } catch (err) {
    console.error('Quickmatch error:', err);
    const errorMessage = err?.message || 'Quick match failed';
    const cleanMessage = errorMessage.replace(/<[^>]*>/g, '').trim() || 'Quick match failed';
    res.status(500).json({ error: cleanMessage });
  }
});

// Multiplayer Quick Match Cancel API
// POST /api/multiplayer/cancel
app.post('/api/multiplayer/cancel', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not configured on server' });
    }

    const { playerId, matchId } = req.body || {};

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'playerId is required' });
    }

    if (!matchId || typeof matchId !== 'string') {
      return res.status(400).json({ error: 'matchId is required' });
    }

    const { data: matchRecord, error: matchErr } = await supabase
      .from('matches')
      .select('id, status, topic')
      .eq('id', matchId)
      .single();

    if (matchErr) {
      console.warn('Supabase cancel match lookup warning:', matchErr?.message);
      return res.status(200).json({ cancelled: false });
    }

    if (!matchRecord || matchRecord.status !== 'waiting') {
      return res.status(200).json({ cancelled: false });
    }

    const { error: deletePlayersErr } = await supabase
      .from('match_players')
      .delete()
      .eq('match_id', matchId)
      .eq('player_id', playerId);

    if (deletePlayersErr) {
      console.warn('Supabase cancel match_players warning:', deletePlayersErr?.message);
    }

    const { error: updateErr } = await supabase
      .from('matches')
      .update({ status: 'cancelled' })
      .eq('id', matchId)
      .eq('status', 'waiting');

    if (updateErr) {
      console.warn('Supabase cancel match update warning:', updateErr?.message);
    }

    return res.status(200).json({ cancelled: true });
  } catch (err) {
    console.error('Cancel quickmatch error:', err);
    res.status(500).json({ error: err.message || 'Failed to cancel match' });
  }
});

// Multiplayer Quick Match Status API
// GET /api/multiplayer/status?matchId=uuid
app.get('/api/multiplayer/status', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not configured on server' });
    }

    const matchId = req.query.matchId;
    if (!matchId || typeof matchId !== 'string') {
      return res.status(400).json({ error: 'matchId is required' });
    }

    const { data: matchRecord, error: matchErr } = await supabase
      .from('matches')
      .select('id, topic, grid, words, placements, status, created_at')
      .eq('id', matchId)
      .single();

    if (matchErr) {
      console.warn('Supabase status lookup warning:', matchErr?.message);
      return res.status(404).json({ error: 'Match not found' });
    }

    return res.status(200).json({
      matchId: matchRecord.id,
      topic: matchRecord.topic === PENDING_TOPIC ? null : matchRecord.topic,
      grid: matchRecord.grid || [],
      words: matchRecord.words || [],
      placements: matchRecord.placements || [],
      status: matchRecord.status,
      createdAt: matchRecord.created_at,
    });
  } catch (err) {
    console.error('Match status error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch match status' });
  }
});

// For Vercel serverless, export the app directly
// For local development, start the server
if (require.main === module) {
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
}

module.exports = app;

