-- Recreate matchmaking function to avoid ambiguous match_id and GROUP BY issues
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
  -- Ensure user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User with id % does not exist. Please create user first.', p_user_id;
  END IF;
  
  -- Find a waiting match with exactly 1 player (no GROUP BY with FOR UPDATE)
  SELECT m.id
  INTO v_match_id
  FROM matches m
  WHERE m.status = 'waiting'
    AND m.mode = p_mode
    AND (
      SELECT COUNT(*)::INTEGER
      FROM match_players mp
      WHERE mp.match_id = m.id
    ) = 1
  ORDER BY m.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;
  
  -- If we found a match, get player count
  IF v_match_id IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER
    INTO v_current_players
    FROM match_players mp2
    WHERE mp2.match_id = v_match_id;
  END IF;
  
  -- If match found
  IF v_match_id IS NOT NULL THEN
    -- Already in match?
    IF EXISTS (
      SELECT 1 FROM match_players mp3
      WHERE mp3.match_id = v_match_id AND mp3.player_id = p_user_id
    ) THEN
      SELECT status INTO v_match_status FROM matches WHERE id = v_match_id;
      
      SELECT COUNT(*)::INTEGER INTO v_current_players
      FROM match_players mp4
      WHERE mp4.match_id = v_match_id;
      
      SELECT COUNT(*)::INTEGER INTO v_player_count
      FROM match_players mp5
      WHERE mp5.match_id = v_match_id AND mp5.joined_at < (
        SELECT joined_at FROM match_players mp6
        WHERE mp6.match_id = v_match_id AND mp6.player_id = p_user_id
      );
      
      RETURN QUERY SELECT 
        v_match_id,
        CASE WHEN v_player_count = 0 THEN 'player1' ELSE 'player2' END,
        v_match_status,
        v_current_players;
      RETURN;
    END IF;
    
    -- Join match
    INSERT INTO match_players (match_id, player_id, joined_at)
    VALUES (v_match_id, p_user_id, NOW())
    ON CONFLICT (match_id, player_id) DO NOTHING;
    
    -- Re-count
    SELECT COUNT(*)::INTEGER INTO v_current_players
    FROM match_players mp7
    WHERE mp7.match_id = v_match_id;
    
    IF v_current_players >= 2 THEN
      UPDATE matches
      SET status = 'in_progress',
          started_at = NOW()
      WHERE id = v_match_id AND status = 'waiting';
      
      v_match_status := 'in_progress';
    ELSE
      v_match_status := 'waiting';
    END IF;
    
    RETURN QUERY SELECT 
      v_match_id,
      'player2',
      v_match_status,
      v_current_players;
    RETURN;
  END IF;
  
  -- No match, create new
  INSERT INTO matches (status, mode, created_by, created_at)
  VALUES ('waiting', p_mode, p_user_id, NOW())
  RETURNING id INTO v_match_id;
  
  INSERT INTO match_players (match_id, player_id, joined_at)
  VALUES (v_match_id, p_user_id, NOW());
  
  RETURN QUERY SELECT 
    v_match_id,
    'player1',
    'waiting',
    1;
END;
$$;

