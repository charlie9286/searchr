import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://kiaouacakhzchdwbnmss.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpYW91YWNha2h6Y2hkd2JubXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTg4MjksImV4cCI6MjA3ODE3NDgyOX0.eOailcu5q76nuKqMKSXnQvEhLWbtT7ymf9tldJreLYw';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

let supabase = null;

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Using default public Supabase credentials. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY for production.');
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing credentials. Multiplayer features will be disabled.');
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY };
