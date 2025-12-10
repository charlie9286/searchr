-- Make created_by nullable in matches table to handle cases where user might not exist
ALTER TABLE matches ALTER COLUMN created_by DROP NOT NULL;

