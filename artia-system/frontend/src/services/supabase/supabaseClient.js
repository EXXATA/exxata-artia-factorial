import { createClient } from '@supabase/supabase-js';

const viteEnv = import.meta.env || {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL || null;
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY || null;

const fallbackSupabaseClient = {
  auth: {
    async getSession() {
      return { data: { session: null } };
    },
    async signOut() {
      return { error: null };
    }
  }
};

if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar configuradas no frontend');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  : fallbackSupabaseClient;
