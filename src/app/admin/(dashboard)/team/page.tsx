import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { Badge, Flash, PageHead, btnDanger, btnDark, btnOutline, input } from '@/components/admin/ui';
import { ConfirmButton, SubmitButton } from '@/components/admin/ConfirmButton';
import { inviteAdmin, removeAdmin, updateAdmin } from '../actions';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

const ROLE_HELP = {
  owner: 'Everything, including team and settings',
  manager: 'Products, categories, orders, inventory, customers, reviews, settings',
  staff: 'Orders, payments, inventory levels and customers'
};

export default async function TeamPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { supabase, user } = await requireAdmin('owner');
  const { data: admins } = await supabase.from('admins').select('user_id, role, is_active, display_name, created_at').order('created_at');
  // Emails live in Supabase Auth; reading them needs the service role (owner-only page).
  const emails = new Map<string, string>();
  try {
    const { data } = await createServiceClient().auth.admin.listUsers({ perPage: 200 });
    data.users.forEach((u) => emails.set(u.id, u.email || ''));
  } catch { /* emails are optional on this page */ }

  return (
    <>
      <PageHead title="Team" sub="Admin accounts are created by invitation only — there is no public sign-up." />
      <Flash ok={ok} error={error} />
      <div className="mb-10 space-y-3">
        {(admins || []).map((a) => (
          <div key={a.user_id} className="flex flex-wrap items-center gap-3 border border-line bg-white p-4">
            <form action={updateAdmin} className="flex flex-1 flex-wrap items-center gap-3">
              <input type="hidden" name="userId" value={a.user_id} />
              <div className="min-w-56 flex-1">
                <p className="text-ink">{a.display_name || emails.get(a.user_id) || 'Admin'} {a.user_id === user.id && <Badge>You</Badge>} {!a.is_active && <Badge tone="bad">Deactivated</Badge>}</p>
                <p className="text-xs text-muted">{emails.get(a.user_id)}</p>
              </div>
              <select name="role" defaultValue={a.role} className={`${input} w-36`} aria-label="Role">
                <option value="owner">Owner</option><option value="manager">Manager</option><option value="staff">Staff</option>
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={a.is_active} />Active</label>
              <SubmitButton className={btnOutline}>Save</SubmitButton>
            </form>
            {a.user_id !== user.id && (
              <form action={removeAdmin}>
                <input type="hidden" name="userId" value={a.user_id} />
                <ConfirmButton className={btnDanger} message="Remove this person's admin access?">Remove</ConfirmButton>
              </form>
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-serif text-2xl">Invite someone</h2>
      <form action={inviteAdmin} className="grid max-w-3xl gap-3 border border-line bg-white p-4 md:grid-cols-[2fr_1.4fr_1fr_auto] md:items-end">
        <label className="text-xs text-muted">Email<input name="email" type="email" required className={`${input} mt-1`} /></label>
        <label className="text-xs text-muted">Name (optional)<input name="displayName" className={`${input} mt-1`} /></label>
        <label className="text-xs text-muted">Role
          <select name="role" defaultValue="staff" className={`${input} mt-1`}><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select>
        </label>
        <SubmitButton className={btnDark}>Send invite</SubmitButton>
      </form>
      <dl className="mt-6 max-w-3xl space-y-1 text-xs text-muted">
        {Object.entries(ROLE_HELP).map(([r, d]) => <div key={r}><dt className="inline capitalize text-text">{r}: </dt><dd className="inline">{d}</dd></div>)}
      </dl>
    </>
  );
}
