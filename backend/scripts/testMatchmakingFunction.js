// Test script to verify the matchmaking function is accessible
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zntyikobnwnjodxekysu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudHlpa29ibnduam9keGVreXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzc0ODQsImV4cCI6MjA4MDg1MzQ4NH0.hDMDprstJkmFaQkJNqKLWGOZg9v8-Gc6wcy_XXBxBMU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

async function testFunction() {
  console.log('Testing matchmaking function...');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Using service role key:', SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...');
  
  // Test with a dummy UUID
  const testUserId = '00000000-0000-0000-0000-000000000001';
  
  try {
    const { data, error } = await supabase.rpc('find_or_create_match', {
      p_user_id: testUserId,
      p_mode: 'versus'
    });
    
    if (error) {
      console.error('❌ RPC Error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      console.error('Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Function call successful!');
      console.log('Result:', data);
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
  
  // Also try to query the function directly from pg_proc
  try {
    const { data: funcData, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname, pronargs')
      .eq('proname', 'find_or_create_match')
      .limit(1);
    
    if (funcError) {
      console.log('Note: Cannot query pg_proc (expected - not accessible via Supabase client)');
    } else {
      console.log('Function found in pg_proc:', funcData);
    }
  } catch (err) {
    console.log('Note: Cannot query pg_proc (expected)');
  }
}

testFunction();

