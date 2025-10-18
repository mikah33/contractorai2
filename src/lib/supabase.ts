import { createClient } from '@supabase/supabase-js';

// Use environment variables for configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration error:', {
    urlExists: !!supabaseUrl,
    keyExists: !!supabaseAnonKey,
    urlValue: supabaseUrl,
    env: import.meta.env
  });
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Validate URL format
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
  throw new Error(`Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL. Got: ${supabaseUrl}`);
}

// Create Supabase client with auth persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});