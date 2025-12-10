-- Update matchmaking function to prevent self-matches and double-counting
-- Uses DISTINCT counts and explicit ON CONFLICT constraint targeting

CREATE OR REPLACE FUNCTION public.find_or_create_match(
  p_user_id UUID,
  p_mode    TEXT DEFAULT 'versus'
)
RETURNS TABLE (
  match_id        UUID,
  joined_as       TEXT,
  match_status    TEXT,
  current_players INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_match_id         UUID;
  v_match_status     TEXT;
  v_current_players  INTEGER;
  v_user_exists      BOOLEAN;
BEGIN
  -- 1. Ensure user exists
  SELECT EXISTS(
    SELECT 1 FROM public.users u WHERE u.id = p_user_id
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User with id % does not exist. Please create user first.', p_user_id;
  END IF;

  -- 2. If user is already in an open match (waiting or in_progress), just return that
  SELECT m.id,
         m.status,
         COUNT(DISTINCT mp.player_id)::INT AS player_count
  INTO v_match_id, v_match_status, v_current_players
  FROM public.matches m
  JOIN public.match_players mp ON mp.match_id = m.id
  WHERE mp.player_id = p_user_id
    AND m.mode = p_mode
    AND m.status IN ('waiting', 'in_progress')
  GROUP BY m.id, m.status
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      v_match_id,
      CASE WHEN v_current_players = 1 THEN 'player1' ELSE 'player2' END,
      v_match_status,
      v_current_players;
    RETURN;
  END IF;

  -- 3. Try to find a waiting match with exactly 1 DISTINCT player, not this user
  SELECT m.id
  INTO v_match_id
  FROM public.matches m
  WHERE m.status = 'waiting'
    AND m.mode   = p_mode
    AND (
      SELECT COUNT(DISTINCT mp.player_id)
      FROM public.match_players mp
      WHERE mp.match_id = m.id
    ) = 1
    AND NOT EXISTS (
      SELECT 1
      FROM public.match_players mp2
      WHERE mp2.match_id = m.id
        AND mp2.player_id = p_user_id
    )
  ORDER BY m.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  -- 4. If we found a match, join as second player
  IF v_match_id IS NOT NULL THEN
    INSERT INTO public.match_players (match_id, player_id, joined_at)
    VALUES (v_match_id, p_user_id, NOW())
    ON CONFLICT ON CONSTRAINT match_players_match_id_player_id_key
    DO NOTHING;

    -- Count DISTINCT players after join
    SELECT COUNT(DISTINCT mp.player_id)::INT
    INTO v_current_players
    FROM public.match_players mp
    WHERE mp.match_id = v_match_id;

    IF v_current_players >= 2 THEN
      UPDATE public.matches m
      SET status     = 'in_progress',
          started_at = NOW()
      WHERE m.id = v_match_id
        AND m.status = 'waiting';

      v_match_status := 'in_progress';
    ELSE
      v_match_status := 'waiting';
    END IF;

    RETURN QUERY
    SELECT
      v_match_id,
      'player2',
      v_match_status,
      v_current_players;
    RETURN;
  END IF;

  -- 5. No suitable match found → create a new one and join as player1
  INSERT INTO public.matches (status, mode, created_by, created_at)
  VALUES ('waiting', p_mode, p_user_id, NOW())
  RETURNING id INTO v_match_id;

  INSERT INTO public.match_players (match_id, player_id, joined_at)
  VALUES (v_match_id, p_user_id, NOW())
  ON CONFLICT ON CONSTRAINT match_players_match_id_player_id_key
  DO NOTHING;

  v_match_status    := 'waiting';
  v_current_players := 1;

  RETURN QUERY
  SELECT
    v_match_id,
    'player1',
    v_match_status,
    v_current_players;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.find_or_create_match(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_match(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_match(UUID, TEXT) TO service_role;

