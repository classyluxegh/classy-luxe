import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import { publicEnv } from '@/lib/env';

/** Supabase client bound to the visitor's session (respects RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      }
    }
  });
}
