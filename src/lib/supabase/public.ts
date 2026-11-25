import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

/** Cookie-less anon client for public catalogue reads (cacheable, respects RLS). */
export function createPublicClient() {
  return createSupabaseClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
