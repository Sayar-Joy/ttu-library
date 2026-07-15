import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client for Frontend
 * Uses the anon/public key for client-side operations
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zclgdoysycqatwgxtspm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fS7Oeucqq9bH98pDs7w0Pw_PMQpS-xE';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found in environment variables. Using defaults from .env');
}

// Create Supabase client for frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export default supabase;
