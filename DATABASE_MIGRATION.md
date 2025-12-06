# Database Migration Guide

## New Database Schema

The application now uses a new database schema with the following key tables:

### Users Table
- `id` (uuid, primary key) - Game Center player ID
- `display_name` (text, unique) - Validated, child-friendly username
- `xp` (int, default: 0) - Experience points
- `level` (int, default: 1) - Player level
- `coins` (int, default: 0) - In-game currency
- `avatar_url` (text, nullable)
- `is_active` (boolean, default: true)
- `created_at` (timestamptz)
- `last_seen_at` (timestamptz)

### Username Validation

The system now includes child-friendly username filtering:
- Minimum 3 characters, maximum 20 characters
- Only alphanumeric, spaces, hyphens, and underscores
- Blocks inappropriate words and patterns
- Auto-generates safe usernames if validation fails

### Level & XP System

- **XP Formula**: `XP = 100 * level * (level + 1) / 2`
  - Level 1: 0-100 XP
  - Level 2: 101-300 XP
  - Level 3: 301-600 XP
  - And so on...

- **XP Rewards**:
  - Base: 50 XP per game
  - Words bonus: Up to 100 XP (based on words found)
  - Time bonus: Up to 100 XP (based on completion speed)

## Setup Instructions

### 1. Database Setup

Run the SQL migrations in your Supabase database to create the new schema.

### 2. Install Dependencies

For the full circular progress indicator, install react-native-svg:

```bash
cd frontend
npm install react-native-svg
```

Note: The component includes a fallback if react-native-svg is not installed.

### 3. Image Asset

Ensure the magnifying glass icon is available at:
- `/Users/charlie/Desktop/wordsearch/magnifying-glass-computer-icons-magnification-loupe.jpg`

Or move it to `frontend/assets/` and update the import path in `LevelProgress.js`.

## Features Implemented

✅ Username validation and sanitization
✅ User creation/retrieval on first login
✅ Level and XP tracking
✅ Level progress component (circular indicator)
✅ XP calculation and rewards
✅ Display name filtering for child-friendly content

## Next Steps

1. Run database migrations
2. Install react-native-svg (optional, for better visuals)
3. Test username validation
4. Test XP earning after completing games
5. Verify level progression

