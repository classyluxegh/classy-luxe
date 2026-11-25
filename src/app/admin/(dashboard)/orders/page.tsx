import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { ORDER_STATUSES } from '@/lib/types';
import { Badge, Flash, PageHead, input, statusTone } from '@/components/admin/ui';

type Props = { searchParams: Promise<{ status?: string; q?: string; page?: string; ok?: string; error?: string }> };
const PAGE = 25;

export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { supabase } = await requireAdmin();
  let q = supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, total_pesewas, delivery_fee_pesewas, status, payment_status, payment_method, delivery_option, region, created_at', { count: 'exact' });
  if (sp.status && ORDER_STATUSES.some((s) => s.value === sp.status)) q = q.eq('status', sp.status);
  const term = (sp.q || '').trim().replace(/[%_,()]/g, '');
  if (term) q = q.or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
  const { data: orders, count, error } = await q.order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const pages = Math.max(1, Math.ceil((count || 0) / PAGE));
  const qs = (extra: Record<string, string | number>) => new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(term ? { q: term } : {}), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) }).toString();

  return (
    <>
      <PageHead title="Orders" sub={`${count ?? 0} order${count === 1 ? '' : 's'}`} />
      <Flash ok={sp.ok} error={sp.error || error?.message} />
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/admin/orders" className={`border px-3 py-1.5 ${!sp.status ? 'border-ink bg-ink text-ivory' : 'border-line'}`}>All</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s.value} href={`/admin/orders?status=${s.value}`} className={`border px-3 py-1.5 ${sp.status === s.value ? 'border-ink bg-ink text-ivory' : 'border-line'}`}>{s.label}</Link>
        ))}
        <form className="ml-auto w-full sm:w-64">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <input name="q" defaultValue={term} placeholder="Order no., name or phone" className={input} aria-label="Search orders" />
        </form>
      </div>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-ivory text-left text-[.68rem] uppercase tracking-[.14em] text-muted">
            <tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Delivery</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Payment</th></tr>
          </thead>
          <tbody>
            {(orders || []).map((o) => (
              <tr key={o.id} className="border-t border-line hover:bg-ivory-2">
                <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-gold-deep">{o.order_number}</Link></td>
                <td className="p-3 whitespace-nowrap">{new Date(o.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra' })}</td>
                <td className="p-3">{o.customer_name}<span className="block text-xs text-muted">{o.customer_phone}</span></td>
                <td className="p-3">{o.delivery_option === 'gctu' ? 'GCTU' : o.region}</td>
                <td className="p-3 whitespace-nowrap">{money(o.total_pesewas)}{o.delivery_fee_pesewas == null && <span className="block text-xs text-muted">+ delivery TBC</span>}</td>
                <td className="p-3"><Badge tone={statusTone(o.status)}>{o.status.replace(/_/g, ' ')}</Badge></td>
                <td className="p-3"><Badge tone={statusTone(o.payment_status)}>{o.payment_status}</Badge><span className="block text-xs text-muted capitalize">{o.payment_method}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders?.length && <p className="p-6 text-sm text-muted">No orders found.</p>}
      </div>
      {pages > 1 && (
        <nav className="mt-5 flex items-center gap-4 text-sm" aria-label="Pagination">
          {page > 1 && <Link href={`/admin/orders?${qs({ page: page - 1 })}`} className="hover:text-gold-deep">← Newer</Link>}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages && <Link href={`/admin/orders?${qs({ page: page + 1 })}`} className="hover:text-gold-deep">Older →</Link>}
        </nav>
      )}
    </>
  );
}
