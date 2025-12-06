-- PostgreSQL function for atomic matchmaking
-- This function handles the entire matchmaking flow in a single transaction
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions
--
-- Note: This assumes the following schema:
-- matches: id (uuid), status (text), max_players (integer), created_at (timestamp), started_at (timestamp)
-- match_players: match_id (uuid), player_id (uuid), is_host (boolean), status (text), joined_at (timestamp)
-- Unique constraint on match_players(match_id, player_id)

CREATE OR REPLACE FUNCTION find_or_create_match(
  p_user_id UUID,
  p_desired_max_players INTEGER DEFAULT 2
)
RETURNS TABLE (
  match_id UUID,
  joined_as TEXT,
  match_status TEXT,
  is_host BOOLEAN,
  current_players INTEGER
) AS $$
DECLARE
  v_match_id UUID;
  v_current_players INTEGER;
  v_max_players INTEGER;
  v_is_host BOOLEAN := FALSE;
  v_match_status TEXT;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Try to find a waiting match (with row-level lock using FOR UPDATE SKIP LOCKED)
  -- This ensures only one request can process a match at a time
  SELECT m.id, m.max_players, COUNT(mp.id)::INTEGER
  INTO v_match_id, v_max_players, v_current_players
  FROM matches m
  LEFT JOIN match_players mp ON mp.match_id = m.id AND mp.status = 'joined'
  WHERE m.status = 'waiting'
    AND (m.max_players IS NULL OR m.max_players = p_desired_max_players)
  GROUP BY m.id, m.max_players
  HAVING COUNT(mp.id) < COALESCE(m.max_players, 2)
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
      SELECT COALESCE(is_host, FALSE) INTO v_is_host FROM match_players 
        WHERE match_id = v_match_id AND player_id = p_user_id;
      
      -- Re-count players
      SELECT COUNT(*)::INTEGER INTO v_current_players
      FROM match_players
      WHERE match_id = v_match_id AND status = 'joined';
      
      RETURN QUERY SELECT 
        v_match_id,
        CASE WHEN v_is_host THEN 'player1' ELSE 'player2' END,
        v_match_status,
        v_is_host,
        v_current_players;
      RETURN;
    END IF;
    
    -- Insert player into match (with conflict handling)
    INSERT INTO match_players (match_id, player_id, is_host, status, joined_at)
    VALUES (v_match_id, p_user_id, FALSE, 'joined', NOW())
    ON CONFLICT (match_id, player_id) DO NOTHING;
    
    -- Re-count players after insert
    SELECT COUNT(*)::INTEGER INTO v_current_players
    FROM match_players
    WHERE match_id = v_match_id AND status = 'joined';
    
    -- If match is now full, start it
    IF v_current_players >= COALESCE(v_max_players, 2) THEN
      UPDATE matches
      SET status = 'in_progress',
          started_at = NOW()
      WHERE id = v_match_id AND status = 'waiting';
      
      v_match_status := 'in_progress';
    ELSE
      v_match_status := 'waiting';
    END IF;
    
    -- Return match info
    RETURN QUERY SELECT 
      v_match_id,
      'player2',
      v_match_status,
      FALSE,
      v_current_players;
    RETURN;
  END IF;
  
  -- No waiting match found, create a new one
  INSERT INTO matches (status, max_players, created_at)
  VALUES ('waiting', p_desired_max_players, NOW())
  RETURNING id INTO v_match_id;
  
  -- Insert player as host
  INSERT INTO match_players (match_id, player_id, is_host, status, joined_at)
  VALUES (v_match_id, p_user_id, TRUE, 'joined', NOW());
  
  -- Return new match info
  RETURN QUERY SELECT 
    v_match_id,
    'player1',
    'waiting',
    TRUE,
    1;
END;
$$ LANGUAGE plpgsql;


