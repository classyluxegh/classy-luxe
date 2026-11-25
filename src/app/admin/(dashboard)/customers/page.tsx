import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { PageHead, input } from '@/components/admin/ui';

type Props = { searchParams: Promise<{ q?: string; page?: string }> };
const PAGE = 30;

export default async function CustomersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { supabase } = await requireAdmin();
  let q = supabase.from('customer_stats').select('*', { count: 'exact' });
  const term = (sp.q || '').trim().replace(/[%_,()]/g, '');
  if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, count } = await q.order('last_order_at', { ascending: false, nullsFirst: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const pages = Math.max(1, Math.ceil((count || 0) / PAGE));

  return (
    <>
      <PageHead title="Customers" sub={`${count ?? 0} customer${count === 1 ? '' : 's'} — created automatically when someone places an order`} />
      <form className="mb-6 max-w-md"><input name="q" defaultValue={term} placeholder="Search name, phone or email" className={input} aria-label="Search customers" /></form>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ivory text-left text-[.68rem] uppercase tracking-[.14em] text-muted">
            <tr><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Last delivery area</th><th className="p-3">Orders</th><th className="p-3">Paid total</th><th className="p-3">Last order</th></tr>
          </thead>
          <tbody>
            {(data || []).map((c) => (
              <tr key={c.id} className="border-t border-line hover:bg-ivory-2">
                <td className="p-3"><Link href={`/admin/customers/${c.id}`} className="font-medium hover:text-gold-deep">{c.full_name}</Link>{c.email && <span className="block text-xs text-muted">{c.email}</span>}</td>
                <td className="p-3"><a href={`tel:${c.phone}`} className="hover:text-gold-deep">{c.phone}</a></td>
                <td className="p-3">{c.last_region || '—'}</td>
                <td className="p-3">{c.orders_count}</td>
                <td className="p-3">{money(c.paid_pesewas)}</td>
                <td className="p-3 whitespace-nowrap">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Accra' }) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <p className="p-6 text-sm text-muted">No customers yet.</p>}
      </div>
      {pages > 1 && (
        <nav className="mt-5 flex gap-4 text-sm" aria-label="Pagination">
          {page > 1 && <Link href={`/admin/customers?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(page - 1) })}`}>← Previous</Link>}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages && <Link href={`/admin/customers?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(page + 1) })}`}>Next →</Link>}
        </nav>
      )}
    </>
  );
}
