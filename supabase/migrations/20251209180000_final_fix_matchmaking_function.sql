-- Final fix for matchmaking function - ensures correct version is deployed
-- This replaces any existing version with the correct implementation

CREATE OR REPLACE FUNCTION public.find_or_create_match(
  p_user_id UUID,
  p_mode TEXT DEFAULT 'versus'
)
RETURNS TABLE (
  match_id UUID,
  joined_as TEXT,
  match_status TEXT,
  current_players INTEGER
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_match_id UUID;
  v_current_players INTEGER;
  v_match_status TEXT;
  v_player_count INTEGER;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if user exists first
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    -- User doesn't exist - return error
    RAISE EXCEPTION 'User with id % does not exist. Please create user first.', p_user_id;
  END IF;
  
  -- Start transaction (implicit in function)
  
  -- Try to find a waiting match (with row-level lock using FOR UPDATE SKIP LOCKED)
  -- This ensures only one request can process a match at a time
  -- For 2-player matches, we look for matches with exactly 1 player
  -- Use a subquery to count players instead of GROUP BY to avoid FOR UPDATE conflict
  SELECT m.id
  INTO v_match_id
  FROM matches m
  WHERE m.status = 'waiting'
    AND m.mode = p_mode
    AND (
      SELECT COUNT(*)::INTEGER
      FROM match_players mp
      WHERE mp.match_id = m.id
    ) = 1  -- Only matches with exactly 1 player (waiting for second)
  ORDER BY m.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;
  
  -- If we found a match, get the player count
  IF v_match_id IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER
    INTO v_current_players
    FROM match_players
    WHERE match_id = v_match_id;
  END IF;
  
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
  -- User exists (checked at start), so we can safely set created_by
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
$$;

-- Grant execute permission to authenticated users (or anon if needed)
GRANT EXECUTE ON FUNCTION public.find_or_create_match(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_match(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_match(UUID, TEXT) TO service_role;

