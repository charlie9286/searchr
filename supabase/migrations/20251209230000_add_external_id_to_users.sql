-- Add external_id to users for mapping external player IDs (Game Center / guest IDs) to internal UUIDs
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

-- Optional: backfill external_id for existing users if desired (example: set to id)
-- UPDATE public.users SET external_id = id WHERE external_id IS NULL;

