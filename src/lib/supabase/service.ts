import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from '@/lib/env';

/**
 * Service-role client. SERVER ONLY — bypasses RLS.
 * Used solely to call place_order / set_paystack_reference / mark_order_paid,
 * which are not executable by browser roles.
 */
export function createServiceClient() {
  return createSupabaseClient(publicEnv.supabaseUrl, serverEnv.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
