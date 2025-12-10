-- Add unique constraint on (match_id, player_id) required for ON CONFLICT
ALTER TABLE public.match_players
  ADD CONSTRAINT match_players_match_id_player_id_key
  UNIQUE (match_id, player_id);


