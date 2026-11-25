import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { ORDER_STATUSES } from '@/lib/types';
import { Badge, Flash, statusTone } from '@/components/admin/ui';
import { SuggestSearch, type Suggestion } from '@/components/admin/SuggestSearch';

type Props = { searchParams: Promise<{ status?: string; payment?: string; q?: string; page?: string; ok?: string; error?: string }> };
const PAGE = 25;
const UNPAID = ['unpaid', 'pending', 'failed'];
const OPEN = ['pending', 'confirmed', 'processing', 'ready_for_delivery', 'out_for_delivery'];
const label = (s: string) => ORDER_STATUSES.find((x) => x.value === s)?.label ?? s.replace(/_/g, ' ');

export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const unpaid = sp.payment === 'unpaid';
  const status = sp.status && ORDER_STATUSES.some((s) => s.value === sp.status) ? sp.status : undefined;
  const term = (sp.q || '').trim().replace(/[%_,()]/g, '');
  const { supabase } = await requireAdmin();

  let q = supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, total_pesewas, delivery_fee_pesewas, status, payment_status, payment_method, delivery_option, region, created_at', { count: 'exact' });
  if (status) q = q.eq('status', status);
  if (unpaid) q = q.in('payment_status', UNPAID).neq('status', 'cancelled');
  if (term) q = q.or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);

  const [{ data: orders, count, error }, { data: all }] = await Promise.all([
    q.order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    supabase.from('orders').select('id, order_number, customer_name, customer_phone, status, payment_status, total_pesewas').order('created_at', { ascending: false })
  ]);

  // Counts for the summary cards and filter pills
  const rows = all || [];
  const byStatus = (s: string) => rows.filter((r) => r.status === s).length;
  const owing = rows.filter((r) => r.status !== 'cancelled' && UNPAID.includes(r.payment_status));
  const owingTotal = owing.reduce((n, r) => n + r.total_pesewas, 0);
  const inProgress = rows.filter((r) => OPEN.includes(r.status) && r.status !== 'pending').length;

  const suggestions: Suggestion[] = rows.map((r) => ({
    label: `${r.order_number} · ${r.customer_name}`,
    sub: `${r.customer_phone} · ${money(r.total_pesewas)} · ${label(r.status)}`,
    keywords: r.customer_phone,
    href: `/admin/orders/${r.id}`
  }));

  const pages = Math.max(1, Math.ceil((count || 0) / PAGE));
  const qs = (extra: Record<string, string | number>) => new URLSearchParams({
    ...(status ? { status } : {}), ...(unpaid ? { payment: 'unpaid' } : {}), ...(term ? { q: term } : {}),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)]))
  }).toString();
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' });
  const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

  const search = (
    <SuggestSearch items={suggestions} defaultValue={term} placeholder="Order no., name or phone" ariaLabel="Search orders"
      hidden={{ status, payment: unpaid ? 'unpaid' : undefined }}
      clearHref={status ? `/admin/orders?status=${status}` : unpaid ? '/admin/orders?payment=unpaid' : '/admin/orders'} />
  );

  const pills: { href: string; text: string; n: number; active: boolean; gold?: boolean }[] = [
    { href: '/admin/orders', text: 'All', n: rows.length, active: !status && !unpaid },
    { href: '/admin/orders?payment=unpaid', text: 'Awaiting payment', n: owing.length, active: unpaid, gold: true },
    ...ORDER_STATUSES.map((s) => ({ href: `/admin/orders?status=${s.value}`, text: s.label, n: byStatus(s.value), active: status === s.value }))
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      {unpaid ? (
        <>
        <div className="flex justify-end">{search}</div>
        <section className="relative overflow-hidden rounded-xl bg-ink p-6 text-ivory sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_90%_at_90%_10%,rgba(201,169,110,.25),transparent_60%)]" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <Link href="/admin/orders" className="text-xs text-ivory/50 hover:text-gold">← All orders</Link>
              <p className="mt-3 text-[.66rem] uppercase tracking-[.26em] text-gold">Awaiting payment</p>
              <p className="mt-1 font-serif text-[clamp(2.2rem,4vw,3.2rem)] font-light leading-none">{money(owingTotal)}</p>
              <p className="mt-2 text-sm text-ivory/55">{owing.length} order{owing.length === 1 ? '' : 's'} not paid yet</p>
            </div>
            <ol className="max-w-sm space-y-2 text-sm text-ivory/70">
              <li className="flex gap-3"><Step n={1} />Check the money has arrived (MoMo, cash or bank).</li>
              <li className="flex gap-3"><Step n={2} />Open the order and click <span className="text-gold-light">Mark as paid</span>.</li>
              <li className="flex gap-3"><Step n={3} />It moves into Total sales on the dashboard.</li>
            </ol>
          </div>
        </section>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[.66rem] uppercase tracking-[.26em] text-gold-deep">Sales</p>
              <h1 className="mt-1 font-serif text-[clamp(2rem,3.2vw,2.8rem)] font-light leading-none">Orders</h1>
              <p className="mt-2 text-sm text-muted">Every order from WhatsApp and Paystack checkout, newest first.</p>
            </div>
            {search}
          </div>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="All orders" value={String(rows.length)} hint={`${byStatus('delivered')} delivered`} dark />
            <Stat label="To confirm" value={String(byStatus('pending'))} hint="New orders waiting for you" warn={byStatus('pending') > 0} />
            <Stat label="Awaiting payment" value={money(owingTotal)} hint={`${owing.length} unpaid order${owing.length === 1 ? '' : 's'}`} warn={owing.length > 0} />
            <Stat label="On the way" value={String(byStatus('out_for_delivery'))} hint={`${inProgress} in progress overall`} />
          </section>
        </>
      )}

      <Flash ok={sp.ok} error={sp.error || error?.message} />

      {/* ── Toolbar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <nav className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-1" aria-label="Filter orders">
          {pills.map((p) => (
            <Link key={p.href} href={p.href} aria-current={p.active ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors ${
                p.active ? (p.gold ? 'border-gold bg-gold text-ink' : 'border-ink bg-ink text-ivory')
                  : p.gold ? 'border-gold/50 bg-white text-gold-deep hover:border-gold' : 'border-line bg-white text-ink hover:border-ink'}`}>
              {p.text}
              <span className={`rounded-full px-1.5 text-[.65rem] ${p.active ? 'bg-ivory/20' : 'bg-ivory text-muted'}`}>{p.n}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* ── List ─────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="hidden grid-cols-[1.1fr_1.5fr_1fr_1fr_1.2fr_auto] gap-4 border-b border-line bg-ivory px-5 py-3 text-[.64rem] uppercase tracking-[.18em] text-muted lg:grid">
          <span>Order</span><span>Customer</span><span>Delivery</span><span>Total</span><span>Status</span><span className="w-28" />
        </div>
        <ul className="divide-y divide-line">
          {(orders || []).map((o) => {
            const owes = o.status !== 'cancelled' && UNPAID.includes(o.payment_status);
            return (
              <li key={o.id} data-search={`${o.order_number} ${o.customer_name} ${o.customer_phone}`.toLowerCase()} className={`relative grid items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-ivory/60 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.5fr_1fr_1fr_1.2fr_auto] ${owes ? 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-gold' : ''}`}>
                <div>
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-ink hover:text-gold-deep">{o.order_number}</Link>
                  <p className="text-xs text-muted">{fmtDate(o.created_at)} · {fmtTime(o.created_at)}</p>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand font-serif text-sm text-gold-deep">{initials(o.customer_name)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{o.customer_name}</p>
                    <p className="text-xs text-muted">{o.customer_phone}</p>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="text-ink">{o.delivery_option === 'gctu' ? 'GCTU campus' : o.delivery_option === 'accra' ? 'Within Accra' : 'Nationwide'}</p>
                  <p className="text-xs text-muted">{o.region}</p>
                </div>
                <div>
                  <p className="font-serif text-lg leading-none">{money(o.total_pesewas)}</p>
                  {o.delivery_fee_pesewas == null && <p className="mt-1 text-[.7rem] text-gold-deep" title="The delivery fee for this order hasn’t been set yet — confirm it with the customer, then enter it on the order page.">+ delivery fee to confirm</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={statusTone(o.status)}>{label(o.status)}</Badge>
                  <Badge tone={statusTone(o.payment_status)}>{o.payment_status}</Badge>
                  <span className="w-full text-[.7rem] capitalize text-muted">{o.payment_method === 'paystack' ? 'Paystack' : 'WhatsApp'}</span>
                </div>
                <div className="flex justify-end lg:w-28">
                  <Link href={`/admin/orders/${o.id}`} className="group inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted hover:text-gold-deep">View <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span></Link>
                </div>
              </li>
            );
          })}
        </ul>
        {!orders?.length && (
          <p className="p-10 text-center text-sm text-muted">
            {unpaid ? 'Nothing awaiting payment — every open order has been paid.' : term ? `No orders match “${term}”.` : 'No orders here yet.'}
          </p>
        )}
      </section>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={`/admin/orders?${qs({ page: page - 1 })}`} className="rounded-full border border-line bg-white px-4 py-2 hover:border-ink">← Newer</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={`/admin/orders?${qs({ page: page + 1 })}`} className="rounded-full border border-line bg-white px-4 py-2 hover:border-ink">Older →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

function Stat({ label, value, hint, dark, warn }: { label: string; value: string; hint: string; dark?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${dark ? 'border-ink bg-charcoal' : 'border-line bg-white'}`}>
      <p className={`text-[.62rem] uppercase tracking-[.22em] ${dark ? 'text-gold' : 'text-muted'}`}>{label}</p>
      <p className={`mt-2 font-serif text-[1.9rem] leading-none ${dark ? 'text-ivory' : warn ? 'text-gold-deep' : 'text-ink'}`}>{value}</p>
      <p className={`mt-2 truncate text-xs ${dark ? 'text-ivory/55' : 'text-muted'}`}>{hint}</p>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold/50 text-[.62rem] text-gold">{n}</span>;
}
