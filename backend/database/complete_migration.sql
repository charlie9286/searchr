-- Complete Migration Script for WordSearch Database
-- Run this entire script in your Supabase SQL Editor
-- This will:
-- 1. Drop existing tables (if they exist)
-- 2. Create all new tables with the updated schema
-- 3. Create the matchmaking function

-- ============================================
-- STEP 1: Drop existing tables (if they exist)
-- ============================================
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS match_players;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS puzzles;
DROP TABLE IF EXISTS friendships;
DROP TABLE IF EXISTS users;

-- ============================================
-- STEP 2: Create tables with new schema
-- ============================================

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text UNIQUE NOT NULL,
  xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  coins int NOT NULL DEFAULT 0,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz
);
rm
-- Create friendships table
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id),
  addressee_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

-- Create puzzles table
CREATE TABLE puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  puzzle_code text NOT NULL UNIQUE,
  grid jsonb NOT NULL,
  words jsonb NOT NULL,
  placements jsonb NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Create matches table
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_id uuid REFERENCES puzzles(id),
  mode text NOT NULL,
  status text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

-- Create match_players table
CREATE TABLE match_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id),
  player_id uuid NOT NULL REFERENCES users(id),
  joined_at timestamptz DEFAULT now(),
  team smallint,
  time int,
  result text,
  xp_earned int NOT NULL DEFAULT 0,
  coins_earned int NOT NULL DEFAULT 0,
  UNIQUE (match_id, player_id)
);

-- Create achievements table
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  metadata jsonb
);

-- Create user_achievements table
CREATE TABLE user_achievements (
  user_id uuid NOT NULL REFERENCES users(id),
  achievement_id uuid NOT NULL REFERENCES achievements(id),
  unlocked_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ============================================
-- STEP 3: Create matchmaking function
-- ============================================

-- PostgreSQL function for atomic matchmaking
-- This function handles the entire matchmaking flow in a single transaction
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions
CREATE OR REPLACE FUNCTION find_or_create_match(
  p_user_id UUID,
  p_mode TEXT DEFAULT 'versus'
)
RETURNS TABLE (
  match_id UUID,
  joined_as TEXT,
  match_status TEXT,
  current_players INTEGER
) AS $$
DECLARE
  v_match_id UUID;
  v_current_players INTEGER;
  v_match_status TEXT;
  v_player_count INTEGER;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Try to find a waiting match (with row-level lock using FOR UPDATE SKIP LOCKED)
  -- This ensures only one request can process a match at a time
  -- For 2-player matches, we look for matches with exactly 1 player
  SELECT m.id, COUNT(mp.id)::INTEGER
  INTO v_match_id, v_current_players
  FROM matches m
  LEFT JOIN match_players mp ON mp.match_id = m.id
  WHERE m.status = 'waiting'
    AND m.mode = p_mode
  GROUP BY m.id
  HAVING COUNT(mp.id) = 1  -- Only matches with exactly 1 player (waiting for second)
  ORDER BY m.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;
  
  -- If we found a match
  IF v_match_id IS NOT NULL THEN
    -- Check if player is already in this match
    IF EXISTS (
      SELECT 1 FROM match_players 
      WHERE match_id = v_match_id AND player_id = p_user_id
    ) THEN
      -- Player already in match, return current state
      SELECT status INTO v_match_status FROM matches WHERE id = v_match_id;
      
      -- Re-count players
      SELECT COUNT(*)::INTEGER INTO v_current_players
      FROM match_players
      WHERE match_id = v_match_id;
      
      -- Determine player number by order (first player is player1)
      SELECT COUNT(*)::INTEGER INTO v_player_count
      FROM match_players
      WHERE match_id = v_match_id AND joined_at < (
        SELECT joined_at FROM match_players 
        WHERE match_id = v_match_id AND player_id = p_user_id
      );
      
      RETURN QUERY SELECT 
        v_match_id,
        CASE WHEN v_player_count = 0 THEN 'player1' ELSE 'player2' END,
        v_match_status,
        v_current_players;
      RETURN;
    END IF;
    
    -- Insert player into match (with conflict handling)
    INSERT INTO match_players (match_id, player_id, joined_at)
    VALUES (v_match_id, p_user_id, NOW())
    ON CONFLICT (match_id, player_id) DO NOTHING;
    
    -- Re-count players after insert
    SELECT COUNT(*)::INTEGER INTO v_current_players
    FROM match_players
    WHERE match_id = v_match_id;
    
    -- If match is now full (2 players), start it
    IF v_current_players >= 2 THEN
      UPDATE matches
      SET status = 'in_progress',
          started_at = NOW()
      WHERE id = v_match_id AND status = 'waiting';
      
      v_match_status := 'in_progress';
    ELSE
      v_match_status := 'waiting';
    END IF;
    
    -- Return match info (this player is player2)
    RETURN QUERY SELECT 
      v_match_id,
      'player2',
      v_match_status,
      v_current_players;
    RETURN;
  END IF;
  
  -- No waiting match found, create a new one
  INSERT INTO matches (status, mode, created_by, created_at)
  VALUES ('waiting', p_mode, p_user_id, NOW())
  RETURNING id INTO v_match_id;
  
  -- Insert player as first player
  INSERT INTO match_players (match_id, player_id, joined_at)
  VALUES (v_match_id, p_user_id, NOW());
  
  -- Return new match info (this player is player1)
  RETURN QUERY SELECT 
    v_match_id,
    'player1',
    'waiting',
    1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Migration Complete!
-- ============================================
-- All tables and functions have been created.
-- You can now use the matchmaking system.

