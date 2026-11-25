import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { ORDER_STATUSES } from '@/lib/types';
import { Badge, Flash, statusTone } from '@/components/admin/ui';
import { SalesChart } from '@/components/admin/SalesChart';
import { WelcomeIntro } from '@/components/admin/WelcomeIntro';

interface Summary {
  orders: number; orders_open: number; orders_pending: number; orders_completed: number; products_total: number; products_active: number;
  customers_total: number; reviews_pending: number; low_stock_threshold: number; revenue_pesewas: number; pipeline_pesewas: number;
  by_status: Record<string, number>;
  daily: { day: string; orders: number; sales_pesewas: number }[];
  top_products: { name: string; units: number; sales_pesewas: number }[];
  low_stock: { product_id: string; name: string; label: string; stock: number }[];
}

type Props = { searchParams: Promise<{ error?: string; days?: string }> };

const PERIODS = [7, 30, 90] as const;
const STATUS_COLOURS: Record<string, string> = {
  pending: '#C9A96E', confirmed: '#9C7C40', processing: '#7A6A52', ready_for_delivery: '#5E5446',
  out_for_delivery: '#3D3731', delivered: '#1F7A4D', cancelled: '#A2493B'
};

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Africa/Accra' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default async function Dashboard({ searchParams }: Props) {
  const { error: flash, days: daysParam } = await searchParams;
  const days = PERIODS.includes(Number(daysParam) as 7 | 30 | 90) ? Number(daysParam) : 30;
  const { supabase, role, name } = await requireAdmin();
  const [{ data, error }, { data: recent }] = await Promise.all([
    supabase.rpc('admin_sales_summary', { p_days: days }),
    supabase.from('orders').select('id, order_number, customer_name, total_pesewas, status, payment_status, created_at').order('created_at', { ascending: false }).limit(6)
  ]);
  if (error) return <p className="text-danger">Could not load statistics: {error.message}</p>;
  const s = data as Summary;
  const firstName = name.includes('@') ? name.split('@')[0] : name.split(' ')[0];
  const statusTotal = Object.values(s.by_status).reduce((a, b) => a + b, 0);
  const topMax = Math.max(1, ...s.top_products.map((t) => t.units));
  const manager = role !== 'staff';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Accra' });

  return (
    <div className="space-y-6">
      <Flash error={flash} />

      {/* ── Welcome band ───────────────────────────── */}
      <section className="relative overflow-hidden rounded-xl bg-ink px-6 py-8 text-ivory sm:px-10 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_85%_20%,rgba(201,169,110,.25),transparent_60%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-10 font-serif text-[11rem] italic leading-none text-ivory/[.04]">CL</span>
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <WelcomeIntro today={today} greeting={greeting()} name={firstName} days={days} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-ivory/15 p-0.5">
              {PERIODS.map((p) => (
                <Link key={p} href={`/admin?days=${p}`} className={`rounded-full px-4 py-1.5 text-xs transition-colors ${p === days ? 'bg-gold text-ink' : 'text-ivory/70 hover:text-ivory'}`}>{p} days</Link>
              ))}
            </div>
            <Link href="/" target="_blank" className="rounded-full border border-ivory/15 px-4 py-1.5 text-xs text-ivory/70 hover:border-gold hover:text-gold">View store ↗</Link>
          </div>
        </div>
      </section>

      {s.orders_pending > 0 && (
        <Link href="/admin/orders?status=pending" className="group flex items-center justify-between gap-4 rounded-lg border border-gold/50 bg-gold/10 px-5 py-4 text-sm transition-colors hover:bg-gold/20">
          <span className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold-deep" /></span>
            <span><strong className="font-medium">{s.orders_pending} order{s.orders_pending === 1 ? '' : 's'}</strong> waiting for you to confirm on WhatsApp</span>
          </span>
          <span className="text-gold-deep transition-transform group-hover:translate-x-1">Review →</span>
        </Link>
      )}

      {/* ── Key figures ────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total sales" value={money(s.revenue_pesewas)} hint="Paid orders · refunds excluded" accent />
        <Kpi label="Orders" value={String(s.orders)} hint={`${s.orders_completed} delivered`} href="/admin/orders" />
        <Kpi label="Awaiting payment" value={money(s.pipeline_pesewas)} hint="View unpaid orders & mark as paid →" href="/admin/orders?payment=unpaid" />
        <Kpi label="Customers" value={String(s.customers_total)} hint="Everyone who has ordered" href="/admin/customers" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        {/* ── Chart ── */}
        <Panel>
          <SalesChart daily={s.daily} />
        </Panel>

        {/* ── Order pipeline ── */}
        <Panel title="Order pipeline" action={<Link href="/admin/orders" className="text-xs text-gold-deep hover:underline">All orders →</Link>}>
          {statusTotal > 0 ? (
            <>
              <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-beige" aria-hidden="true">
                {ORDER_STATUSES.filter((st) => s.by_status[st.value]).map((st) => (
                  <span key={st.value} style={{ width: `${(s.by_status[st.value] / statusTotal) * 100}%`, background: STATUS_COLOURS[st.value] }} />
                ))}
              </div>
              <ul className="space-y-1">
                {ORDER_STATUSES.map((st) => (
                  <li key={st.value}>
                    <Link href={`/admin/orders?status=${st.value}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-ivory">
                      <span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOURS[st.value] }} />{st.label}</span>
                      <span className="tabular-nums text-muted">{s.by_status[st.value] || 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : <Empty text="No orders in this period yet." />}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ── Top fragrances ── */}
        <Panel title="Top fragrances">
          {s.top_products.length ? (
            <ol className="space-y-4">
              {s.top_products.map((t, i) => (
                <li key={t.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex items-baseline gap-2.5 truncate"><span className="font-serif italic text-gold-deep">0{i + 1}</span><span className="truncate">{t.name}</span></span>
                    <span className="whitespace-nowrap text-xs text-muted">{t.units} sold · {money(t.sales_pesewas)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-beige"><div className="h-full rounded-full bg-linear-to-r from-gold-deep to-gold" style={{ width: `${(t.units / topMax) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          ) : <Empty text="Your best sellers will appear here." />}
        </Panel>

        {/* ── Low stock ── */}
        <Panel title="Low stock" action={<Link href="/admin/inventory?filter=low" className="text-xs text-gold-deep hover:underline">Inventory →</Link>}>
          {s.low_stock.length ? (
            <ul className="divide-y divide-line">
              {s.low_stock.map((l) => (
                <li key={l.name + l.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link className="truncate hover:text-gold-deep" href={manager ? `/admin/products/${l.product_id}` : '/admin/inventory'}>{l.name} <span className="text-muted">{l.label}</span></Link>
                  <Badge tone={l.stock === 0 ? 'bad' : 'warn'}>{l.stock === 0 ? 'Sold out' : `${l.stock} left`}</Badge>
                </li>
              ))}
            </ul>
          ) : <Empty text={`Nothing at or below ${s.low_stock_threshold}. Only sizes with stock tracking on are checked.`} />}
        </Panel>

        {/* ── Store at a glance + quick actions ── */}
        <Panel title="At a glance">
          <dl className="grid grid-cols-2 gap-3">
            <Mini label="Products live" value={`${s.products_active}/${s.products_total}`} />
            <Mini label="Open orders" value={String(s.orders_open)} />
            <Mini label="Delivered" value={String(s.orders_completed)} />
            <Mini label="Reviews to check" value={String(s.reviews_pending)} />
          </dl>
          <div className="mt-5 grid gap-2">
            {manager && <Quick href="/admin/products?new=product" label="Add a new fragrance" />}
            <Quick href="/admin/orders?status=pending" label="Confirm pending orders" />
            <Quick href="/admin/inventory" label="Update stock levels" />
            {manager && <Quick href="/admin/settings" label="Edit store settings" />}
          </div>
        </Panel>
      </div>

      {/* ── Recent orders ── */}
      <Panel title="Recent orders" action={<Link href="/admin/orders" className="text-xs text-gold-deep hover:underline">View all →</Link>}>
        {recent?.length ? (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-[.64rem] uppercase tracking-[.16em] text-muted">
                <tr><th className="px-2 pb-3 font-normal">Order</th><th className="px-2 pb-3 font-normal">Customer</th><th className="px-2 pb-3 font-normal">Date</th><th className="px-2 pb-3 font-normal">Total</th><th className="px-2 pb-3 font-normal">Status</th><th className="px-2 pb-3 font-normal">Payment</th></tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-line transition-colors hover:bg-ivory">
                    <td className="px-2 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-gold-deep">{o.order_number}</Link></td>
                    <td className="px-2 py-3">{o.customer_name}</td>
                    <td className="px-2 py-3 text-muted">{new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Accra' })}</td>
                    <td className="px-2 py-3">{money(o.total_pesewas)}</td>
                    <td className="px-2 py-3"><Badge tone={statusTone(o.status)}>{o.status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-2 py-3"><Badge tone={statusTone(o.payment_status)}>{o.payment_status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty text="No orders yet. When customers check out, their orders appear here." />}
      </Panel>
    </div>
  );
}

function Panel({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_0_rgba(15,13,11,.03)]">
      {title && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-ink">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Kpi({ label, value, hint, href, accent }: { label: string; value: string; hint: string; href?: string; accent?: boolean }) {
  const body = (
    <>
      <p className={`text-[.64rem] uppercase tracking-[.22em] ${accent ? 'text-gold' : 'text-muted'}`}>{label}</p>
      <p className={`mt-3 font-serif text-[2.1rem] leading-none ${accent ? 'text-ivory' : 'text-ink'}`}>{value}</p>
      <p className={`mt-3 text-xs ${accent ? 'text-ivory/55' : 'text-muted'}`}>{hint}</p>
    </>
  );
  const cls = `block rounded-xl border p-6 ${accent ? 'border-ink bg-charcoal' : 'border-line bg-white'}`;
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ivory px-4 py-3">
      <dt className="text-[.62rem] uppercase tracking-[.18em] text-muted">{label}</dt>
      <dd className="mt-1 font-serif text-2xl text-ink">{value}</dd>
    </div>
  );
}

function Quick({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between rounded-lg border border-line px-4 py-2.5 text-sm transition-colors hover:border-ink hover:bg-ink hover:text-ivory">
      {label}<span className="text-gold-deep transition-transform group-hover:translate-x-1 group-hover:text-gold">→</span>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg bg-ivory px-4 py-6 text-center text-sm text-muted">{text}</p>;
}
