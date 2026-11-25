import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { SuggestSearch, type Suggestion } from '@/components/admin/SuggestSearch';

type Props = { searchParams: Promise<{ q?: string; page?: string; sort?: string }> };
const PAGE = 30;

const SORTS = {
  recent: { label: 'Recent activity', column: 'last_order_at' },
  spend: { label: 'Top spenders', column: 'paid_pesewas' },
  orders: { label: 'Most orders', column: 'orders_count' },
  newest: { label: 'Newest', column: 'created_at' }
} as const;
type Sort = keyof typeof SORTS;

export default async function CustomersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort: Sort = sp.sort && sp.sort in SORTS ? (sp.sort as Sort) : 'recent';
  const term = (sp.q || '').trim().replace(/[%_,()]/g, '');
  const { supabase } = await requireAdmin();

  let q = supabase.from('customer_stats').select('*', { count: 'exact' });
  if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  const [{ data, count }, { data: all }] = await Promise.all([
    q.order(SORTS[sort].column, { ascending: false, nullsFirst: false }).range((page - 1) * PAGE, page * PAGE - 1),
    supabase.from('customer_stats').select('id, full_name, phone, email, orders_count, paid_pesewas, created_at').order('full_name')
  ]);

  // Summary figures
  const everyone = all || [];
  const repeat = everyone.filter((c) => c.orders_count >= 2).length;
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newThisMonth = everyone.filter((c) => +new Date(c.created_at) >= monthAgo).length;
  const spent = everyone.reduce((n, c) => n + (c.paid_pesewas || 0), 0);
  const buyers = everyone.filter((c) => c.paid_pesewas > 0).length;

  const suggestions: Suggestion[] = everyone.map((c) => ({
    label: c.full_name,
    sub: `${c.phone} · ${c.orders_count} order${c.orders_count === 1 ? '' : 's'}`,
    keywords: `${c.phone} ${c.email || ''}`,
    href: `/admin/customers/${c.id}`
  }));

  const pages = Math.max(1, Math.ceil((count || 0) / PAGE));
  const href = (extra: Record<string, string | number>) => `/admin/customers?${new URLSearchParams({
    ...(term ? { q: term } : {}), ...(sort !== 'recent' ? { sort } : {}),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)]))
  })}`;
  const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' });
  const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const waNumber = (p: string) => p.replace(/\D/g, '').replace(/^0/, '233');

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[.66rem] uppercase tracking-[.26em] text-gold-deep">Clients</p>
          <h1 className="mt-1 font-serif text-[clamp(2rem,3.2vw,2.8rem)] font-light leading-none">Customers</h1>
          <p className="mt-2 text-sm text-muted">Added automatically whenever someone places an order.</p>
        </div>
        <SuggestSearch items={suggestions} defaultValue={term} placeholder="Name, phone or email" ariaLabel="Search customers"
          hidden={{ sort: sort !== 'recent' ? sort : undefined }}
          clearHref={sort !== 'recent' ? `/admin/customers?sort=${sort}` : '/admin/customers'} />
      </div>

      {/* ── Summary ──────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Customers" value={String(everyone.length)} hint={`${buyers} have paid for an order`} dark />
        <Stat label="Repeat customers" value={String(repeat)} hint={everyone.length ? `${Math.round((repeat / everyone.length) * 100)}% ordered more than once` : 'Ordered more than once'} />
        <Stat label="New this month" value={String(newThisMonth)} hint="First order in the last 30 days" />
        <Stat label="Total spent" value={money(spent)} hint={buyers ? `About ${money(Math.round(spent / buyers))} per paying customer` : 'From paid orders'} />
      </section>

      {/* ── Sort ─────────────────────────────────────── */}
      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Sort customers">
        {(Object.keys(SORTS) as Sort[]).map((k) => (
          <Link key={k} href={`/admin/customers?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(k !== 'recent' ? { sort: k } : {}) })}`}
            aria-current={sort === k ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-xs transition-colors ${sort === k ? 'border-ink bg-ink text-ivory' : 'border-line bg-white text-ink hover:border-ink'}`}>
            {SORTS[k].label}
          </Link>
        ))}
        {term && <span className="ml-2 self-center text-xs text-muted">{count ?? 0} result{count === 1 ? '' : 's'} for “{term}”</span>}
      </nav>

      {/* ── List ─────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="hidden grid-cols-[1.6fr_1.2fr_1fr_.7fr_1fr_1fr_auto] gap-4 border-b border-line bg-ivory px-5 py-3 text-[.64rem] uppercase tracking-[.18em] text-muted lg:grid">
          <span>Customer</span><span>Phone</span><span>Area</span><span>Orders</span><span>Total paid</span><span>Last order</span><span className="w-14" />
        </div>
        <ul className="divide-y divide-line">
          {(data || []).map((c) => (
            <li key={c.id} data-search={`${c.full_name} ${c.phone} ${c.email || ''}`.toLowerCase()} className="grid items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-ivory/60 sm:grid-cols-2 lg:grid-cols-[1.6fr_1.2fr_1fr_.7fr_1fr_1fr_auto]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-sm text-gold-light">{initials(c.full_name)}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2">
                    <Link href={`/admin/customers/${c.id}`} className="truncate font-medium text-ink hover:text-gold-deep">{c.full_name}</Link>
                    {c.orders_count >= 2 && <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[.6rem] uppercase tracking-[.14em] text-gold-deep">Repeat</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{c.email || `Since ${day(c.created_at)}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <a href={`tel:${c.phone}`} className="text-ink hover:text-gold-deep">{c.phone}</a>
                <a href={`https://wa.me/${waNumber(c.phone)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.full_name}`} title="WhatsApp"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366]/10 text-[#128C4A] transition-colors hover:bg-[#25D366] hover:text-white">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.45 9.43m8.04-17.47A11.3 11.3 0 0 0 12.04.7C5.77.7.67 5.8.67 12.07c0 2 .52 3.96 1.52 5.68L.57 23.3l5.68-1.49a11.33 11.33 0 0 0 5.79 1.48h.01c6.27 0 11.37-5.1 11.38-11.37 0-3.04-1.18-5.9-3.33-8.05" /></svg>
                </a>
              </div>
              <p className="truncate text-sm text-ink">{c.last_region || '—'}</p>
              <p className="text-sm"><span className="font-serif text-lg">{c.orders_count}</span> <span className="text-xs text-muted lg:hidden">order{c.orders_count === 1 ? '' : 's'}</span></p>
              <p className="font-serif text-lg leading-none">{money(c.paid_pesewas)}</p>
              <p className="text-sm text-muted">{c.last_order_at ? day(c.last_order_at) : '—'}</p>
              <div className="flex justify-end lg:w-14">
                <Link href={`/admin/customers/${c.id}`} className="group inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted hover:text-gold-deep">View <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span></Link>
              </div>
            </li>
          ))}
        </ul>
        {!data?.length && (
          <p className="p-10 text-center text-sm text-muted">{term ? `No customers match “${term}”.` : 'No customers yet — they appear here after their first order.'}</p>
        )}
      </section>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={href({ page: page - 1 })} className="rounded-full border border-line bg-white px-4 py-2 hover:border-ink">← Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={href({ page: page + 1 })} className="rounded-full border border-line bg-white px-4 py-2 hover:border-ink">Next →</Link> : <span />}
        </nav>
      )}
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
