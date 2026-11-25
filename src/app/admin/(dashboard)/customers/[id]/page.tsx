import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { Badge, Card, PageHead, statusTone } from '@/components/admin/ui';

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetail({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: c }, { data: orders }] = await Promise.all([
    supabase.from('customer_stats').select('*').eq('id', id).maybeSingle(),
    supabase.from('orders').select('id, order_number, total_pesewas, status, payment_status, created_at, delivery_option, region').eq('customer_id', id).order('created_at', { ascending: false })
  ]);
  if (!c) notFound();
  const wa = String(c.phone).replace(/\D/g, '').replace(/^0/, '233');

  return (
    <>
      <Link href="/admin/customers" className="mb-4 inline-block text-sm text-muted hover:text-ink">← All customers</Link>
      <PageHead title={c.full_name} sub={`Customer since ${new Date(c.created_at).toLocaleDateString('en-GB', { dateStyle: 'long', timeZone: 'Africa/Accra' })}`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card>
          <h2 className="mb-3 font-serif text-2xl">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted">Phone</dt><dd><a href={`tel:${c.phone}`} className="hover:text-gold-deep">{c.phone}</a> · <a className="text-whatsapp hover:underline" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a></dd></div>
            {c.email && <div><dt className="text-muted">Email</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div>}
            <div><dt className="text-muted">Last delivery address</dt><dd>{c.last_location || '—'}{c.last_region && <span className="block text-muted">{c.last_region}</span>}</dd></div>
            <div><dt className="text-muted">Orders</dt><dd>{c.orders_count} · {money(c.paid_pesewas)} paid</dd></div>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-3 font-serif text-2xl">Order history</h2>
          {orders?.length ? (
            <table className="w-full text-sm"><tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="py-2 pr-3"><Link className="font-medium hover:text-gold-deep" href={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                  <td className="py-2 pr-3">{new Date(o.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Accra' })}</td>
                  <td className="py-2 pr-3">{money(o.total_pesewas)}</td>
                  <td className="py-2 pr-3"><Badge tone={statusTone(o.status)}>{o.status.replace(/_/g, ' ')}</Badge></td>
                  <td className="py-2"><Badge tone={statusTone(o.payment_status)}>{o.payment_status}</Badge></td>
                </tr>
              ))}
            </tbody></table>
          ) : <p className="text-sm text-muted">No orders.</p>}
        </Card>
      </div>
    </>
  );
}
