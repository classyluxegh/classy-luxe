import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { ORDER_STATUSES } from '@/lib/types';
import { Badge, statusTone } from '@/components/admin/ui';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> };
type Order = {
  id: string; order_number: string; total_pesewas: number; status: string; payment_status: string; created_at: string;
  delivery_option: string; region: string; location: string;
  order_items: { product_name: string; variant_label: string; quantity: number }[];
};

const label = (s: string) => ORDER_STATUSES.find((x) => x.value === s)?.label ?? s.replace(/_/g, ' ');
const OPEN = ['pending', 'confirmed', 'processing', 'ready_for_delivery', 'out_for_delivery'];

export default async function CustomerDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const { from } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: c }, { data: rows }] = await Promise.all([
    supabase.from('customer_stats').select('*').eq('id', id).maybeSingle(),
    supabase.from('orders')
      .select('id, order_number, total_pesewas, status, payment_status, created_at, delivery_option, region, location, order_items(product_name, variant_label, quantity)')
      .eq('customer_id', id).order('created_at', { ascending: false })
  ]);
  if (!c) notFound();
  const orders = (rows || []) as Order[];
  // Came here from an order? Offer the way back to it instead of the customer list.
  const fromOrder = from && /^[0-9a-f-]{36}$/i.test(from) ? orders.find((o) => o.id === from) : undefined;

  const day = (d: string, style: 'medium' | 'long' = 'medium') => new Date(d).toLocaleDateString('en-GB', { dateStyle: style, timeZone: 'Africa/Accra' });
  const wa = String(c.phone).replace(/\D/g, '').replace(/^0/, '233');
  const initials = String(c.full_name).split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('') || '?';

  const live = orders.filter((o) => o.status !== 'cancelled');
  const outstanding = live.filter((o) => !['paid', 'refunded'].includes(o.payment_status)).reduce((n, o) => n + o.total_pesewas, 0);
  const paidOrders = live.filter((o) => o.payment_status === 'paid');
  const average = paidOrders.length ? Math.round(c.paid_pesewas / paidOrders.length) : 0;
  const openCount = live.filter((o) => OPEN.includes(o.status)).length;

  // Favourite fragrances across all non-cancelled orders
  const tally = new Map<string, number>();
  for (const o of live) for (const it of o.order_items) {
    const key = it.variant_label ? `${it.product_name} · ${it.variant_label}` : it.product_name;
    tally.set(key, (tally.get(key) || 0) + it.quantity);
  }
  const favourites = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const favMax = Math.max(1, ...favourites.map(([, n]) => n));

  return (
    <div className="space-y-6">
      {fromOrder
        ? <Link href={`/admin/orders/${fromOrder.id}`} className="text-sm text-muted hover:text-ink">← Back to order {fromOrder.order_number}</Link>
        : <Link href="/admin/customers" className="text-sm text-muted hover:text-ink">← All customers</Link>}

      {/* ── Profile band ─────────────────────────────── */}
      <section className="relative overflow-hidden rounded-xl bg-ink p-6 text-ivory sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_90%_at_90%_10%,rgba(201,169,110,.22),transparent_60%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-charcoal font-serif text-2xl text-gold-light">{initials}</span>
            <div className="min-w-0">
              <p className="text-[.66rem] uppercase tracking-[.26em] text-gold">Customer</p>
              <h1 className="mt-1 font-serif text-[clamp(1.9rem,3vw,2.6rem)] font-light leading-none">{c.full_name}</h1>
              <p className="mt-2 text-sm text-ivory/55">
                Since {day(c.created_at, 'long')}{c.last_order_at && <> · Last order {day(c.last_order_at)}</>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-full bg-gold px-5 text-[.7rem] uppercase tracking-[.16em] text-ink hover:bg-gold-light">WhatsApp ↗</a>
            <a href={`tel:${c.phone}`} className="inline-flex h-10 items-center rounded-full border border-ivory/20 px-5 text-[.7rem] uppercase tracking-[.16em] text-ivory/80 hover:border-gold hover:text-gold">Call</a>
          </div>
        </div>
      </section>

      {/* ── Figures ──────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Figure label="Orders" value={String(c.orders_count)} hint={openCount ? `${openCount} still in progress` : 'None in progress'} />
        <Figure label="Total paid" value={money(c.paid_pesewas)} hint={`${paidOrders.length} paid order${paidOrders.length === 1 ? '' : 's'}`} />
        <Figure label="Awaiting payment" value={money(outstanding)} hint={outstanding ? 'Across unpaid orders' : 'Nothing owed'} warn={outstanding > 0} />
        <Figure label="Average order" value={average ? money(average) : '—'} hint="Paid orders only" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.9fr]">
        {/* ── Side ── */}
        <div className="space-y-6">
          <Panel title="Contact">
            <dl className="space-y-4 text-sm">
              <Field k="Phone"><a href={`tel:${c.phone}`} className="hover:text-gold-deep">{c.phone}</a></Field>
              {c.email && <Field k="Email"><a href={`mailto:${c.email}`} className="break-all hover:text-gold-deep">{c.email}</a></Field>}
              <Field k="Last delivery address">
                {c.last_location || '—'}
                {c.last_region && <span className="block text-muted">{c.last_region}</span>}
              </Field>
            </dl>
          </Panel>

          <Panel title="Favourite fragrances">
            {favourites.length ? (
              <ul className="space-y-3">
                {favourites.map(([name, n]) => (
                  <li key={name} className="text-sm">
                    <div className="flex justify-between gap-3"><span className="truncate text-ink">{name}</span><span className="shrink-0 text-muted">× {n}</span></div>
                    <div className="mt-1.5 h-1 rounded-full bg-sand"><div className="h-1 rounded-full bg-gold" style={{ width: `${(n / favMax) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Shows what they buy most once they&apos;ve ordered.</p>}
          </Panel>
        </div>

        {/* ── Orders ── */}
        <Panel title="Order history" aside={`${orders.length} order${orders.length === 1 ? '' : 's'}`}>
          {orders.length ? (
            <ul className="space-y-3">
              {orders.map((o) => {
                const unpaid = o.status !== 'cancelled' && !['paid', 'refunded'].includes(o.payment_status);
                const summary = o.order_items.map((it) => `${it.quantity > 1 ? `${it.quantity}× ` : ''}${it.product_name}${it.variant_label ? ` (${it.variant_label})` : ''}`).join(', ');
                return (
                  <li key={o.id} className={`rounded-lg border p-4 ${unpaid ? 'border-gold/40' : 'border-line'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-ink hover:text-gold-deep">{o.order_number}</Link>
                        <span className="text-sm text-muted"> · {day(o.created_at)}</span>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{summary || 'No items'}</p>
                        <p className="mt-1 text-xs text-muted">{o.delivery_option === 'gctu' ? 'GCTU campus' : o.delivery_option === 'accra' ? 'Within Accra' : o.region}{o.location ? ` · ${o.location}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-xl leading-none">{money(o.total_pesewas)}</p>
                        <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                          <Badge tone={statusTone(o.status)}>{label(o.status)}</Badge>
                          <Badge tone={statusTone(o.payment_status)}>{o.payment_status}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3 text-xs">
                      {unpaid && <Link href={`/admin/orders/${o.id}#payment`} className="rounded-full bg-ink px-3.5 py-1.5 text-ivory hover:bg-gold hover:text-ink">Mark as paid</Link>}
                      <Link href={`/admin/orders/${o.id}`} className="text-gold-deep hover:underline">Open order →</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted">No orders yet.</p>}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-light">{title}</h2>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Figure({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-5 ${warn ? 'border-gold/60' : 'border-line'}`}>
      <p className="text-[.62rem] uppercase tracking-[.22em] text-muted">{label}</p>
      <p className={`mt-2 font-serif text-[1.8rem] leading-none ${warn ? 'text-gold-deep' : 'text-ink'}`}>{value}</p>
      <p className="mt-2 truncate text-xs text-muted">{hint}</p>
    </div>
  );
}

function Field({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[.62rem] uppercase tracking-[.2em] text-muted">{k}</dt>
      <dd className="mt-1 text-ink">{children}</dd>
    </div>
  );
}
