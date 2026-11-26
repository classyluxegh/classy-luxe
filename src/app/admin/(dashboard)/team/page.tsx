import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { Flash, btnAdd, PlusIcon } from '@/components/admin/ui';
import { ConfirmButton, SubmitButton } from '@/components/admin/ConfirmButton';
import { inviteAdmin, removeAdmin, updateAdmin } from '../actions';
import { FormFooter, Modal, ModalCancel } from '@/components/admin/Modal';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };
type Role = 'owner' | 'manager' | 'staff';

const ROLES: Record<Role, { label: string; can: string[] }> = {
  owner: { label: 'Owner', can: ['Everything a manager can do', 'Invite and remove team members', 'Change anyone’s role'] },
  manager: { label: 'Manager', can: ['Products, categories and photos', 'Delivery fees, settings and reviews', 'Everything staff can do'] },
  staff: { label: 'Staff', can: ['Orders and recording payments', 'Stock levels', 'Customers'] }
};
const ORDER: Role[] = ['owner', 'manager', 'staff'];

const fieldCls = 'mt-2 h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-gold-deep';
const labelCls = 'block text-[.64rem] uppercase tracking-[.18em] text-muted';

export default async function TeamPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { supabase, user } = await requireAdmin('owner');
  const { data: admins } = await supabase.from('admins').select('user_id, role, is_active, display_name, created_at').order('created_at');
  // Emails and sign-in times live in Supabase Auth; reading them needs the service role (owner-only page).
  const auth = new Map<string, { email: string; lastSignIn: string | null; invited: boolean }>();
  try {
    const { data } = await createServiceClient().auth.admin.listUsers({ perPage: 200 });
    data.users.forEach((u) => auth.set(u.id, { email: u.email || '', lastSignIn: u.last_sign_in_at ?? null, invited: !u.last_sign_in_at }));
  } catch { /* emails are optional on this page */ }

  const team = (admins || []) as { user_id: string; role: Role; is_active: boolean; display_name: string | null; created_at: string }[];
  const count = (r: Role) => team.filter((a) => a.role === r && a.is_active).length;
  const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' });
  const initials = (n: string) => n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[.66rem] uppercase tracking-[.26em] text-gold-deep">Admin access</p>
          <h1 className="mt-1 font-serif text-[clamp(2rem,3.2vw,2.8rem)] font-light leading-none">Team</h1>
          <p className="mt-2 text-sm text-muted">People who can sign in to this admin. Accounts are by invitation only — there’s no public sign-up.</p>
        </div>
        <Modal eyebrow="Team" title="Invite someone" subtitle="They’ll get an email with a link to set their password." openParam="member"
          triggerClassName={btnAdd} trigger={<><PlusIcon />Invite someone</>}>
          <form action={inviteAdmin} className="space-y-5">
            <label className="block"><span className={labelCls}>Email</span><input name="email" type="email" required placeholder="name@example.com" className={fieldCls} /></label>
            <label className="block"><span className={labelCls}>Name <span className="normal-case tracking-normal">(optional)</span></span><input name="displayName" placeholder="e.g. Ama" className={fieldCls} /></label>
            <fieldset>
              <legend className={labelCls}>Role</legend>
              <div className="mt-2 grid gap-2">
                {(['staff', 'manager', 'owner'] as Role[]).map((r) => (
                  <label key={r} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-3.5 transition-colors has-[:checked]:border-gold has-[:checked]:bg-gold/5">
                    <input type="radio" name="role" value={r} defaultChecked={r === 'staff'} className="mt-0.5 accent-[#9C7C40]" />
                    <span><span className="block text-sm text-ink">{ROLES[r].label}</span><span className="block text-xs text-muted">{ROLES[r].can.join(' · ')}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <FormFooter hint="Invites are the only way to join.">
              <ModalCancel />
              <SubmitButton className="inline-flex h-11 items-center rounded-full bg-gold px-6 text-[.7rem] uppercase tracking-[.16em] text-ink transition-colors hover:bg-gold-light disabled:opacity-50">Send invite</SubmitButton>
            </FormFooter>
          </form>
        </Modal>
      </div>

      <Flash ok={ok} error={error} />

      {/* ── Summary ──────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Team members" value={String(team.length)} hint={`${team.filter((a) => a.is_active).length} active`} dark />
        <Stat label="Owners" value={String(count('owner'))} hint="Full access" />
        <Stat label="Managers" value={String(count('manager'))} hint="Run the catalogue and settings" />
        <Stat label="Staff" value={String(count('staff'))} hint="Handle orders and stock" />
      </section>

      {/* ── Members ──────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {team.map((a) => {
          const info = auth.get(a.user_id);
          const name = a.display_name || info?.email || 'Admin';
          const me = a.user_id === user.id;
          return (
            <article key={a.user_id} className={`flex flex-col rounded-xl border bg-white p-5 ${a.is_active ? 'border-line' : 'border-dashed border-line opacity-70'}`}>
              <div className="flex items-start gap-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-serif text-lg ${a.role === 'owner' ? 'bg-gold/20 text-gold-deep ring-1 ring-gold/50' : 'bg-sand text-gold-deep'}`}>{initials(name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-ink">{name}</span>
                    {me && <span className="rounded-full bg-ink px-2 py-0.5 text-[.58rem] uppercase tracking-[.14em] text-ivory">You</span>}
                  </p>
                  {info?.email && a.display_name && <p className="truncate text-xs text-muted">{info.email}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[.62rem] uppercase tracking-[.14em] ${a.role === 'owner' ? 'bg-gold/20 text-gold-deep' : a.role === 'manager' ? 'bg-beige text-ink' : 'bg-ivory text-muted'}`}>{ROLES[a.role].label}</span>
                    {!a.is_active && <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[.62rem] uppercase tracking-[.14em] text-danger">Deactivated</span>}
                    {a.is_active && info?.invited && <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-[.62rem] uppercase tracking-[.14em] text-gold-deep">Invite sent</span>}
                  </div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-ivory/70 p-3 text-xs">
                <div><dt className="text-muted">Added</dt><dd className="mt-0.5 text-ink">{day(a.created_at)}</dd></div>
                <div><dt className="text-muted">Last signed in</dt><dd className="mt-0.5 text-ink">{info?.lastSignIn ? day(info.lastSignIn) : 'Not yet'}</dd></div>
              </dl>

              {me ? (
                <p className="mt-auto pt-4 text-xs text-muted">This is you. Another owner can change your role.</p>
              ) : (
                <details className="group mt-auto pt-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink transition-colors hover:border-gold">
                    Manage access <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <form action={updateAdmin} className="space-y-3">
                      <input type="hidden" name="userId" value={a.user_id} />
                      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={`Role for ${name}`}>
                        {ORDER.map((r) => (
                          <label key={r} className="cursor-pointer">
                            <input type="radio" name="role" value={r} defaultChecked={a.role === r} className="peer sr-only" />
                            <span className="flex h-9 items-center justify-center rounded-lg border border-line text-xs text-ink transition-colors hover:border-gold peer-checked:border-gold peer-checked:bg-gold/15 peer-focus-visible:ring-2 peer-focus-visible:ring-gold/50">{ROLES[r].label}</span>
                          </label>
                        ))}
                      </div>
                      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5 text-sm">
                        <span><span className="block text-ink">Can sign in</span><span className="block text-xs text-muted">Untick to pause their access</span></span>
                        <input type="checkbox" name="isActive" defaultChecked={a.is_active} className="h-4 w-4 accent-[#9C7C40]" />
                      </label>
                      <SubmitButton className="h-10 w-full rounded-full bg-gold text-[.68rem] uppercase tracking-[.14em] text-ink transition-colors hover:bg-gold-light disabled:opacity-50">Save changes</SubmitButton>
                    </form>
                    <form action={removeAdmin}>
                      <input type="hidden" name="userId" value={a.user_id} />
                      <ConfirmButton className="h-10 w-full rounded-full text-xs text-danger transition-colors hover:bg-danger/5" message={`Remove ${name}'s admin access?`}>Remove from team</ConfirmButton>
                    </form>
                  </div>
                </details>
              )}
            </article>
          );
        })}
      </section>

      {/* ── Roles explained ──────────────────────────── */}
      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-light text-ink">What each role can do</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {ORDER.map((r) => (
            <div key={r} className="rounded-lg bg-ivory/70 p-4">
              <p className="text-[.64rem] uppercase tracking-[.2em] text-gold-deep">{ROLES[r].label}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-text">
                {ROLES[r].can.map((c) => <li key={c} className="flex gap-2"><span aria-hidden="true" className="text-gold">✓</span>{c}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint, dark }: { label: string; value: string; hint: string; dark?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${dark ? 'border-ink bg-charcoal' : 'border-line bg-white'}`}>
      <p className={`text-[.62rem] uppercase tracking-[.22em] ${dark ? 'text-gold' : 'text-muted'}`}>{label}</p>
      <p className={`mt-2 font-serif text-[1.9rem] leading-none ${dark ? 'text-ivory' : 'text-ink'}`}>{value}</p>
      <p className={`mt-2 truncate text-xs ${dark ? 'text-ivory/55' : 'text-muted'}`}>{hint}</p>
    </div>
  );
}
