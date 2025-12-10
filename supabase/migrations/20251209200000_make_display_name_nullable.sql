-- Make display_name nullable to allow users without display names initially
-- Users will set their display name on first login via the display name setup screen

ALTER TABLE users ALTER COLUMN display_name DROP NOT NULL;

