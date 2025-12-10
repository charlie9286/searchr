const { createClient } = require('@supabase/supabase-js');

// Default points to the new Supabase project; keys must come from environment.
const DEFAULT_SUPABASE_URL = 'https://zntyikobnwnjodxekysu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudHlpa29ibnduam9keGVreXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzc0ODQsImV4cCI6MjA4MDg1MzQ4NH0.hDMDprstJkmFaQkJNqKLWGOZg9v8-Gc6wcy_XXBxBMU';

const SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] Supabase URL or service role key not set. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment for production.');
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      },
    })
  : null;

module.exports = {
  supabase,
  SUPABASE_URL,
};
