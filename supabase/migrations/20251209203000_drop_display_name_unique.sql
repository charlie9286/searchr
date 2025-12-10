-- Drop unique constraint on display_name so names don't have to be unique
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_display_name_key;

