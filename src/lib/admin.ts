import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AdminRole } from '@/lib/types';

const RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

/**
 * Ensures the current user is an active administrator with at least `min` role.
 * Call in every admin page and server action — RLS enforces the same rules in the database.
 */
export async function requireAdmin(min: AdminRole = 'staff') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: admin } = await supabase.from('admins').select('role, is_active, display_name').eq('user_id', user.id).maybeSingle();
  if (!admin || !admin.is_active) redirect('/admin/login?error=not-admin');
  const role = admin.role as AdminRole;
  if (RANK[role] < RANK[min]) redirect('/admin?error=' + encodeURIComponent('You do not have permission to open that page.'));
  return { supabase, user, role, name: (admin.display_name as string | null) || user.email || 'Admin' };
}

export function canManage(role: AdminRole) { return RANK[role] >= RANK.manager; }

/** Redirect back with a flash message (?ok= / ?error=). */
export function back(path: string, kind: 'ok' | 'error', message: string): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}
