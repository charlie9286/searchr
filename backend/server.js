const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyC9Iwk-AhebNcYsKr25KnIbxDNW0j6eyzg');

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

async function generateModel() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    console.log('Using model: gemini-2.0-flash-exp');
    return model;
  } catch (err) {
    console.warn('Failed to load gemini-2.0-flash-exp, falling back:', err.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('Using model: gemini-1.5-flash (fallback)');
    return model;
  } catch (err) {
    console.error('Failed to initialize any Gemini model:', err.message);
    throw new Error('Gemini API not available. Please check your API key.');
  }
}

async function generateWordsForTopic(topic) {
  if (!topic || topic.trim().length < 3) {
    throw new Error('Topic must be at least 3 characters');
  }

  const model = await generateModel();
  const prompt = PROMPT_TEMPLATE(topic);

  const result = await model.generateContent(prompt);
  const text = (await result.response).text();
  console.log('Gemini word search response:', text.substring(0, 300));

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

async function buildPuzzle(topic) {
  const words = await generateWordsForTopic(topic);
  const generator = new WordSearchGenerator(15);
  const { grid, placements } = generator.generate(words);
  return { grid, words, placements, topic };
}

const PENDING_TOPIC = '__PENDING__';

async function selectQuickMatchTopic(recentTopics = []) {
  const exclusions = recentTopics
    .map(topic => (typeof topic === 'string' ? topic.toUpperCase() : ''))
    .filter(Boolean);

  const model = await generateModel();
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
    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
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
    throw new Error('Unable to generate unique quick match topic');
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
    res.status(500).json({ error: err.message || 'Failed to generate word search' });
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
app.post('/api/multiplayer/quickmatch', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not configured on server' });
    }

    const { playerId } = req.body || {};

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const { data: waitingMatches, error: waitingErr } = await supabase
      .from('matches')
      .select('id, topic, status, puzzle_id')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(5);

    if (waitingErr) {
      console.error('Supabase quickmatch waiting error:', waitingErr);
      return res.status(500).json({ error: waitingErr.message });
    }

    let matchWaitingForOpponent = null;

    if (waitingMatches && waitingMatches.length > 0) {
      for (const match of waitingMatches) {
        const { data: existingPlayers, error: playersErr } = await supabase
          .from('match_players')
          .select('player_id')
          .eq('match_id', match.id);

        if (playersErr) {
          console.warn('Supabase quickmatch player lookup warning:', playersErr?.message);
          continue;
        }

        const players = existingPlayers || [];
        const hasDifferentPlayer = players.some(row => row.player_id && row.player_id !== playerId);
        const alreadyWaiting = players.some(row => row.player_id === playerId);

        if (!hasDifferentPlayer && alreadyWaiting) {
          matchWaitingForOpponent = match;
          continue;
        }

        if (!hasDifferentPlayer) {
          continue;
        }

        const { error: insertPlayerErr } = await supabase
          .from('match_players')
          .insert({
            match_id: match.id,
            player_id: playerId,
          });

        if (insertPlayerErr) {
          console.error('Supabase quickmatch join error:', insertPlayerErr);
          return res.status(500).json({ error: insertPlayerErr.message });
        }

        const { data: recentTopicsData, error: recentErr } = await supabase
          .from('matches')
          .select('topic')
          .order('created_at', { ascending: false })
          .limit(50);

        if (recentErr) {
          console.warn('Supabase quickmatch recent topics warning:', recentErr?.message);
        }

        const recentTopics = (recentTopicsData || [])
          .map(row => row.topic)
          .filter(topic => topic && topic !== PENDING_TOPIC);

        const topic = await selectQuickMatchTopic(recentTopics);
        const puzzle = await buildPuzzle(topic);
        const puzzleId = match.puzzle_id || puzzle.puzzleId || crypto.randomUUID();

        const { error: updateErr } = await supabase
          .from('matches')
          .update({
            topic,
            puzzle_id: puzzleId,
            grid: puzzle.grid,
            words: puzzle.words,
            placements: puzzle.placements,
            status: 'active',
          })
          .eq('id', match.id)
          .eq('status', 'waiting');

        if (updateErr) {
          console.error('Supabase quickmatch activate error:', updateErr);
          return res.status(500).json({ error: updateErr.message });
        }

        return res.status(200).json({
          matchId: match.id,
          topic,
          grid: puzzle.grid,
          words: puzzle.words,
          placements: puzzle.placements,
          status: 'active',
          joinedAs: 'player2',
        });
      }
    }

    if (matchWaitingForOpponent) {
      return res.status(200).json({
        matchId: matchWaitingForOpponent.id,
        topic: null,
        grid: [],
        words: [],
        placements: [],
        status: 'waiting',
        joinedAs: 'player1',
      });
    }

    const placeholderPuzzleId = crypto.randomUUID();
    const { data: newMatch, error: insertMatchErr } = await supabase
      .from('matches')
      .insert({
        topic: PENDING_TOPIC,
        puzzle_id: placeholderPuzzleId,
        grid: [],
        words: [],
        placements: [],
        status: 'waiting',
      })
      .select()
      .single();

    if (insertMatchErr) {
      console.error('Supabase quickmatch insert error:', insertMatchErr);
      return res.status(500).json({ error: insertMatchErr.message });
    }

    const { error: insertPlayerErr } = await supabase
      .from('match_players')
      .insert({
        match_id: newMatch.id,
        player_id: playerId,
      });

    if (insertPlayerErr) {
      console.error('Supabase quickmatch player insert error:', insertPlayerErr);
      return res.status(500).json({ error: insertPlayerErr.message });
    }

    return res.status(200).json({
      matchId: newMatch.id,
      topic: null,
      grid: [],
      words: [],
      placements: [],
      status: 'waiting',
      joinedAs: 'player1',
    });
  } catch (err) {
    console.error('Quickmatch error:', err);
    res.status(500).json({ error: err.message || 'Quick match failed' });
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

