const { createClient } = require('@supabase/supabase-js');

const DEFAULT_SUPABASE_URL = 'https://kiaouacakhzchdwbnmss.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpYW91YWNha2h6Y2hkd2JubXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTg4MjksImV4cCI6MjA3ODE3NDgyOX0.eOailcu5q76nuKqMKSXnQvEhLWbtT7ymf9tldJreLYw';

const SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] Using default Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment for production.');
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
