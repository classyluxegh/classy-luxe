'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(8).max(200) });

export async function signIn(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const parsed = schema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: 'Enter a valid email and password.' };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: 'Incorrect email or password.' };
  const { data: admin } = await supabase.from('admins').select('role, is_active').eq('user_id', data.user.id).maybeSingle();
  if (!admin || !admin.is_active) {
    await supabase.auth.signOut();
    return { error: 'This account does not have admin access.' };
  }
  redirect('/admin');
}
