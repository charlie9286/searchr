# Database Migrations

## Matchmaking Function

To enable atomic matchmaking with proper transaction handling, run the SQL function in `find_or_create_match.sql` in your Supabase database.

### Setup Instructions

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the contents of `find_or_create_match.sql`

This creates a PostgreSQL function that:
- Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
- Handles match finding and creation atomically
- Automatically starts matches when they're full
- Returns match information including player role and status

### Required Schema

The function assumes the following schema:

**matches table:**
- `id` (uuid, primary key)
- `status` (text) - values: 'waiting', 'in_progress', 'active', 'completed'
- `max_players` (integer) - default 2
- `created_at` (timestamp)
- `started_at` (timestamp, nullable)
- `topic` (text, nullable)
- `puzzle_id` (text, nullable)
- `grid` (jsonb, nullable)
- `words` (jsonb, nullable)
- `placements` (jsonb, nullable)

**match_players table:**
- `match_id` (uuid, foreign key to matches.id)
- `player_id` (uuid, foreign key to users.id)
- `is_host` (boolean, default false)
- `status` (text, default 'joined')
- `joined_at` (timestamp, default now())
- Unique constraint on `(match_id, player_id)`

### Usage

The function is called automatically by the `/api/multiplayer/quickmatch` endpoint. If the function doesn't exist, the endpoint will fall back to the old method (which may have race conditions).

