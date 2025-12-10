-- Add unique constraint on (match_id, player_id) required for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'match_players_match_id_player_id_key'
  ) THEN
    ALTER TABLE public.match_players
      ADD CONSTRAINT match_players_match_id_player_id_key
      UNIQUE (match_id, player_id);
  END IF;
END
$$;


