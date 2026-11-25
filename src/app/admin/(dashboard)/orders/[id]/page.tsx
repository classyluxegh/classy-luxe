import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { ORDER_STATUSES } from '@/lib/types';
import { COLLECTIONS } from '@/lib/site';
import { Badge, Card, Flash, PageHead, btnDanger, btnDark, input, statusTone } from '@/components/admin/ui';
import { ConfirmButton, SubmitButton } from '@/components/admin/ConfirmButton';
import { markRefunded, recordPayment, updateOrderDetails, updateOrderStatus } from '../../actions';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function OrderDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, role } = await requireAdmin();
  const { data: o } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(status, note, created_at), payments(id, provider, reference, amount_pesewas, channel, status, verified_at, note, created_at)')
    .eq('id', id)
    .maybeSingle();
  if (!o) notFound();
  type Payment = { id: string; provider: string; reference: string | null; amount_pesewas: number; channel: string | null; status: string; verified_at: string | null; note: string | null; created_at: string };
  const payments = [...((o.payments || []) as Payment[])].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const paid = payments.filter((pm) => pm.status === 'success').reduce((n, pm) => n + pm.amount_pesewas, 0);
  const history = [...(o.order_status_history || [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const phoneDigits = String(o.customer_phone).replace(/\D/g, '').replace(/^0/, '233');
  const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra' });

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-block text-sm text-muted hover:text-ink">← All orders</Link>
      <PageHead title={`Order ${o.order_number}`} sub={`Placed ${fmt(o.created_at)} · ${o.payment_method === 'paystack' ? 'Paystack' : 'WhatsApp'} checkout`}
        action={<div className="flex gap-2"><Badge tone={statusTone(o.status)}>{o.status.replace(/_/g, ' ')}</Badge><Badge tone={statusTone(o.payment_status)}>{o.payment_status}</Badge></div>} />
      <Flash ok={ok} error={error} />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-serif text-2xl">Items</h2>
            <table className="w-full text-sm">
              <tbody>
                {(o.order_items || []).map((it: { id: string; product_name: string; variant_label: string; collection: 'student' | 'general' | null; quantity: number; unit_price_pesewas: number; line_total_pesewas: number }) => (
                  <tr key={it.id} className="border-t border-line">
                    <td className="py-2 pr-3">{it.product_name}{it.variant_label && ` (${it.variant_label})`}{it.collection && <span className="block text-xs text-muted">{COLLECTIONS[it.collection].name}</span>}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{it.quantity} × {money(it.unit_price_pesewas)}</td>
                    <td className="py-2 text-right whitespace-nowrap">{money(it.line_total_pesewas)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm">
                <tr className="border-t border-line"><td colSpan={2} className="py-2">Subtotal</td><td className="py-2 text-right">{money(o.subtotal_pesewas)}</td></tr>
                <tr><td colSpan={2} className="py-1">Delivery</td><td className="py-1 text-right">{o.delivery_fee_pesewas == null ? 'To be confirmed' : money(o.delivery_fee_pesewas)}</td></tr>
                <tr className="font-medium text-ink"><td colSpan={2} className="py-2">Total</td><td className="py-2 text-right font-serif text-xl">{money(o.total_pesewas)}</td></tr>
              </tfoot>
            </table>
          </Card>

          <Card>
            <h2 className="mb-4 font-serif text-2xl">Update status</h2>
            {o.status === 'cancelled' ? <p className="text-sm text-muted">This order was cancelled. Tracked stock was returned to inventory.</p> : (
              <form action={updateOrderStatus} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                <input type="hidden" name="orderId" value={o.id} />
                <label className="text-xs text-muted">Status
                  <select name="status" defaultValue={o.status} className={`${input} mt-1`}>{ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                </label>
                <label className="text-xs text-muted">Note (optional)<input name="note" maxLength={500} className={`${input} mt-1`} placeholder="e.g. Rider dispatched" /></label>
                <SubmitButton className={btnDark}>Update</SubmitButton>
              </form>
            )}
            <p className="mt-3 text-xs text-muted">Cancelling returns tracked stock to inventory and cannot be undone.</p>
          </Card>

          <Card>
            <h2 className="mb-4 font-serif text-2xl">Payments</h2>
            {payments.length ? (
              <table className="mb-5 w-full text-sm">
                <tbody>
                  {payments.map((pm) => (
                    <tr key={pm.id} className="border-t border-line align-top">
                      <td className="py-2 pr-3">{fmt(pm.created_at)}<span className="block text-xs capitalize text-muted">{pm.provider}{pm.channel ? ` · ${pm.channel.replace(/_/g, ' ')}` : ''}</span></td>
                      <td className="py-2 pr-3">{money(pm.amount_pesewas)}{pm.reference && <span className="block break-all text-xs text-muted">{pm.reference}</span>}</td>
                      <td className="py-2 text-right"><Badge tone={pm.status === 'success' ? 'good' : pm.status === 'pending' ? 'warn' : 'bad'}>{pm.status}</Badge>{pm.note && <span className="block text-xs text-muted">{pm.note}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="mb-5 text-sm text-muted">No payments recorded yet.</p>}
            {o.status !== 'cancelled' && o.payment_status !== 'paid' && o.payment_status !== 'refunded' && (
              <form action={recordPayment} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                <input type="hidden" name="orderId" value={o.id} />
                <label className="text-xs text-muted">Amount received (GH₵)<input name="amount" type="number" min={0.01} step="0.01" required defaultValue={(o.total_pesewas - paid) / 100} className={`${input} mt-1`} /></label>
                <label className="text-xs text-muted">Method
                  <select name="channel" className={`${input} mt-1`} defaultValue="mobile_money"><option value="mobile_money">Mobile Money</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option></select>
                </label>
                <label className="text-xs text-muted">Reference / note<input name="note" maxLength={300} placeholder="e.g. MoMo transaction ID" className={`${input} mt-1`} /></label>
                <SubmitButton className={btnDark}>Record payment</SubmitButton>
              </form>
            )}
            {o.payment_status === 'paid' && role !== 'staff' && (
              <form action={markRefunded} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
                <input type="hidden" name="orderId" value={o.id} />
                <label className="flex-1 text-xs text-muted">Refund note<input name="note" maxLength={300} className={`${input} mt-1`} /></label>
                <ConfirmButton className={btnDanger} message="Mark this order as refunded? Return the money through Paystack or MoMo yourself — this only updates the record.">Mark refunded</ConfirmButton>
              </form>
            )}
            {o.payment_method === 'paystack' && <p className="mt-3 text-xs text-muted">Paystack payments are verified with Paystack on the server and marked paid automatically.</p>}
          </Card>

          <Card>
            <h2 className="mb-4 font-serif text-2xl">Delivery fee &amp; notes</h2>
            <form action={updateOrderDetails} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="orderId" value={o.id} />
              <label className="text-xs text-muted">Delivery fee (GH₵) — blank = to be confirmed
                <input name="deliveryFee" type="number" min={0} step="0.01" defaultValue={o.delivery_fee_pesewas == null ? '' : o.delivery_fee_pesewas / 100} className={`${input} mt-1`} />
              </label>
              <label className="text-xs text-muted sm:col-span-2">Internal notes (not visible to the customer)
                <textarea name="adminNotes" rows={3} defaultValue={o.admin_notes || ''} className={`${input} mt-1 h-auto py-2`} />
              </label>
              <div><SubmitButton className={btnDark}>Save</SubmitButton></div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-serif text-2xl">Customer</h2>
            <p className="text-ink">{o.customer_id ? <Link className="hover:text-gold-deep" href={`/admin/customers/${o.customer_id}`}>{o.customer_name}</Link> : o.customer_name}</p>
            <p className="text-sm"><a className="hover:text-gold-deep" href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></p>
            <a className="mt-3 inline-block text-sm text-whatsapp hover:underline" target="_blank" rel="noopener noreferrer"
              href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hello ${o.customer_name}, this is Classy Luxe about your order ${o.order_number}.`)}`}>Message on WhatsApp ↗</a>
          </Card>
          <Card>
            <h2 className="mb-3 font-serif text-2xl">Delivery</h2>
            <dl className="space-y-1 text-sm">
              <div><dt className="inline text-muted">Option: </dt><dd className="inline">{o.delivery_option === 'gctu' ? 'GCTU campus (free)' : o.delivery_option === 'accra' ? 'Within Accra' : 'Nationwide'}</dd></div>
              <div><dt className="inline text-muted">Region: </dt><dd className="inline">{o.region}</dd></div>
              <div><dt className="inline text-muted">Location: </dt><dd className="inline">{o.location}</dd></div>
              {o.notes && <div><dt className="text-muted">Customer notes:</dt><dd>{o.notes}</dd></div>}
            </dl>
          </Card>
          <Card>
            <h2 className="mb-3 font-serif text-2xl">History</h2>
            <ol className="space-y-3 text-sm">
              {history.map((h, i) => (
                <li key={i} className="border-l-2 border-gold pl-3"><span className="capitalize">{h.status.replace(/_/g, ' ')}</span>{h.note && <span className="block text-muted">{h.note}</span>}<span className="block text-xs text-muted">{fmt(h.created_at)}</span></li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
