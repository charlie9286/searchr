-- Migration script to update database schema
-- Run this in your Supabase SQL editor

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS match_players;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS puzzles;
DROP TABLE IF EXISTS friendships;
DROP TABLE IF EXISTS users;

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

