import { createClient } from '@supabase/supabase-js';
import { appParams } from '@/lib/app-params';

const SUPABASE_URL = appParams.supabaseUrl;
const SUPABASE_ANON_KEY = appParams.supabaseAnonKey;

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = hasSupabase
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  : null;
