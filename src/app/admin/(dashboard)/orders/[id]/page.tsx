import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { ORDER_STATUSES } from '@/lib/types';
import { COLLECTIONS } from '@/lib/site';
import { Badge, Flash, btnDanger, btnDark, btnOutline, input, statusTone } from '@/components/admin/ui';
import { ConfirmButton, SubmitButton } from '@/components/admin/ConfirmButton';
import { markRefunded, recordPayment, updateOrderDetails, updateOrderStatus } from '../../actions';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

type Item = {
  id: string; product_name: string; variant_label: string; collection: 'student' | 'general' | null;
  quantity: number; unit_price_pesewas: number; line_total_pesewas: number;
  product: { slug: string; product_images: { url: string; sort_order: number }[] } | null;
};
type Payment = { id: string; provider: string; reference: string | null; amount_pesewas: number; channel: string | null; status: string; verified_at: string | null; note: string | null; created_at: string };
type History = { status: string; note: string | null; created_at: string };

const label = (s: string) => ORDER_STATUSES.find((x) => x.value === s)?.label ?? s.replace(/_/g, ' ');

export default async function OrderDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, role } = await requireAdmin();
  const { data: o } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(slug, product_images(url, sort_order))), order_status_history(status, note, created_at), payments(id, provider, reference, amount_pesewas, channel, status, verified_at, note, created_at)')
    .eq('id', id)
    .maybeSingle();
  if (!o) notFound();

  const items = (o.order_items || []) as Item[];
  const payments = [...((o.payments || []) as Payment[])].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const paid = payments.filter((pm) => pm.status === 'success').reduce((n, pm) => n + pm.amount_pesewas, 0);
  const balance = Math.max(0, o.total_pesewas - paid);
  const history = [...((o.order_status_history || []) as History[])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const phoneDigits = String(o.customer_phone).replace(/\D/g, '').replace(/^0/, '233');
  const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra' });
  const units = items.reduce((n, it) => n + it.quantity, 0);

  const cancelled = o.status === 'cancelled';
  const unpaid = !cancelled && !['paid', 'refunded'].includes(o.payment_status);

  const initials = String(o.customer_name).split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('') || '?';
  const waText = encodeURIComponent(`Hello ${o.customer_name}, this is Classy Luxe about your order ${o.order_number}.`);

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div>
        <Link href="/admin/orders" className="text-sm text-muted hover:text-ink">← All orders</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[.66rem] uppercase tracking-[.26em] text-gold-deep">{o.payment_method === 'paystack' ? 'Paystack checkout' : 'WhatsApp checkout'}</p>
            <h1 className="mt-1 font-serif text-[clamp(2rem,3.2vw,2.8rem)] font-light leading-none">Order {o.order_number}</h1>
            <p className="mt-2 text-sm text-muted">Placed {fmt(o.created_at)} · {units} item{units === 1 ? '' : 's'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(o.status)}>{label(o.status)}</Badge>
            <Badge tone={statusTone(o.payment_status)}>{o.payment_status}</Badge>
          </div>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      {/* ── Money strip ──────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Figure label="Order total" value={money(o.total_pesewas)} hint={o.delivery_fee_pesewas == null ? 'Delivery fee still to confirm' : 'Including delivery'} />
        <Figure label="Delivery fee" value={o.delivery_fee_pesewas == null ? 'To confirm' : o.delivery_fee_pesewas === 0 ? 'Free' : money(o.delivery_fee_pesewas)} hint={o.delivery_option === 'gctu' ? 'GCTU campus' : o.delivery_option === 'accra' ? 'Within Accra' : o.region} />
        <Figure label="Received" value={money(paid)} hint={`${payments.filter((p) => p.status === 'success').length} payment${payments.filter((p) => p.status === 'success').length === 1 ? '' : 's'} recorded`} />
        <Figure label="Balance" value={o.payment_status === 'refunded' ? 'Refunded' : money(balance)} hint={o.payment_status === 'paid' ? 'Fully paid' : cancelled ? 'Order cancelled' : 'Still to be paid'} tone={unpaid && balance > 0 ? 'warn' : o.payment_status === 'paid' ? 'good' : undefined} />
      </section>

      {unpaid && (
        <a href="#payment" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/50 bg-gold/10 px-5 py-4 text-sm">
          <span><strong className="font-medium">Not paid yet</strong> · {money(balance)} outstanding. Once the money has arrived, record it below.</span>
          <span className="rounded-full bg-ink px-4 py-1.5 text-xs text-ivory">Mark as paid ↓</span>
        </a>
      )}

      <div className="grid items-stretch gap-6 xl:grid-cols-[1.75fr_1fr]">
        {/* Row 1 — items | customer & delivery */}
          <Panel title="Items" aside={`${units} item${units === 1 ? '' : 's'}`}>
            <ul className="divide-y divide-line">
              {items.map((it) => {
                const img = [...(it.product?.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
                return (
                  <li key={it.id} className="flex items-center gap-4 py-4 first:pt-0">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-sand">
                      {img ? <Image src={img.url} alt="" fill sizes="56px" className="object-cover" /> :
                        <span className="flex h-full w-full items-center justify-center font-serif text-lg text-gold-deep">{it.product_name[0]}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ink">
                        {it.product?.slug ? <Link href={`/product/${it.product.slug}`} target="_blank" className="hover:text-gold-deep">{it.product_name}</Link> : it.product_name}
                        {it.variant_label && <span className="text-muted"> · {it.variant_label}</span>}
                      </p>
                      <p className="text-xs text-muted">{it.collection ? COLLECTIONS[it.collection].name : ''}{it.collection ? ' · ' : ''}{it.quantity} × {money(it.unit_price_pesewas)}</p>
                    </div>
                    <p className="whitespace-nowrap font-serif text-lg">{money(it.line_total_pesewas)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-2 space-y-2 rounded-lg bg-ivory p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(o.subtotal_pesewas)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{o.delivery_fee_pesewas == null ? 'To be confirmed' : o.delivery_fee_pesewas === 0 ? 'Free' : money(o.delivery_fee_pesewas)}</dd></div>
              <div className="flex items-baseline justify-between border-t border-line pt-2"><dt className="font-medium text-ink">Total</dt><dd className="font-serif text-2xl">{money(o.total_pesewas)}</dd></div>
            </dl>
          </Panel>
          <div className="space-y-6">
            <Panel title="Customer">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-lg text-gold-light">{initials}</span>
                <div className="min-w-0">
                  <p className="truncate text-ink">{o.customer_name}</p>
                  <a className="text-sm text-muted hover:text-gold-deep" href={`tel:${o.customer_phone}`}>{o.customer_phone}</a>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <a className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#25D366]/50 bg-[#25D366]/10 px-4 text-[.7rem] uppercase tracking-[.16em] text-[#128C4A] transition hover:border-[#25D366] hover:bg-[#25D366] hover:text-white" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${phoneDigits}?text=${waText}`}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.45 9.43m8.04-17.47A11.3 11.3 0 0 0 12.04.7C5.77.7.67 5.8.67 12.07c0 2 .52 3.96 1.52 5.68L.57 23.3l5.68-1.49a11.33 11.33 0 0 0 5.79 1.48h.01c6.27 0 11.37-5.1 11.38-11.37 0-3.04-1.18-5.9-3.33-8.05"/></svg>WhatsApp</a>
                <a className={`${btnOutline} rounded-full`} href={`tel:${o.customer_phone}`}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Call</a>
              </div>
              {o.customer_id && <Link className="mt-4 inline-block text-xs text-gold-deep hover:underline" href={`/admin/customers/${o.customer_id}?from=${o.id}`}>View customer profile →</Link>}
            </Panel>

            <Panel title="Delivery">
              <dl className="space-y-3 text-sm">
                <Row k="Option" v={o.delivery_option === 'gctu' ? 'GCTU campus (free)' : o.delivery_option === 'accra' ? 'Within Accra' : 'Nationwide'} />
                <Row k="Region" v={o.region} />
                <Row k="Location" v={o.location} />
              </dl>
              {o.notes && (
                <div className="mt-4 rounded-lg bg-ivory p-3 text-sm">
                  <p className="text-[.62rem] uppercase tracking-[.2em] text-muted">Customer note</p>
                  <p className="mt-1 text-ink">{o.notes}</p>
                </div>
              )}
            </Panel>
          </div>

        {/* Row 2 — payment | history (same height) */}
          <div id="payment" className="scroll-mt-6 h-full">
            <Panel className="h-full" title="Payment" aside={<Badge tone={statusTone(o.payment_status)}>{o.payment_status}</Badge>}>
              {payments.length ? (
                <ul className="mb-5 space-y-2">
                  {payments.map((pm) => (
                    <li key={pm.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-serif text-lg leading-none">{money(pm.amount_pesewas)}</p>
                        <p className="mt-1 text-xs capitalize text-muted">{pm.provider}{pm.channel ? ` · ${pm.channel.replace(/_/g, ' ')}` : ''} · {fmt(pm.created_at)}</p>
                        {(pm.reference || pm.note) && <p className="mt-0.5 break-all text-xs text-muted">{[pm.reference, pm.note].filter(Boolean).join(' · ')}</p>}
                      </div>
                      <Badge tone={pm.status === 'success' ? 'good' : pm.status === 'pending' ? 'warn' : 'bad'}>{pm.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : <p className="mb-5 text-sm text-muted">No payments recorded yet.</p>}

              {unpaid && (
                <form action={recordPayment} className="grid gap-3 rounded-lg border border-gold/40 bg-gold/5 p-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                  <input type="hidden" name="orderId" value={o.id} />
                  <p className="text-xs text-muted sm:col-span-4">Only do this after you&apos;ve seen the money arrive. Once the full amount is recorded the order becomes <strong className="text-ink">Paid</strong> and counts towards Total sales.</p>
                  <label className="text-xs text-muted">Amount received (GH₵)<input name="amount" type="number" min={0.01} step="0.01" required defaultValue={balance / 100} className={`${input} mt-1`} /></label>
                  <label className="text-xs text-muted">Method
                    <select name="channel" className={`${input} mt-1`} defaultValue="mobile_money"><option value="mobile_money">Mobile Money</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option></select>
                  </label>
                  <label className="text-xs text-muted">Reference / note<input name="note" maxLength={300} placeholder="e.g. MoMo transaction ID" className={`${input} mt-1`} /></label>
                  <SubmitButton className={btnDark}>Mark as paid</SubmitButton>
                </form>
              )}

              {o.payment_status === 'paid' && role !== 'staff' && (
                <details className="group rounded-lg border border-line">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm text-muted hover:text-ink">Refund this order <span className="inline-block transition-transform group-open:rotate-180">▾</span></summary>
                  <form action={markRefunded} className="flex flex-wrap items-end gap-3 border-t border-line p-4">
                    <input type="hidden" name="orderId" value={o.id} />
                    <label className="flex-1 text-xs text-muted">Refund note<input name="note" maxLength={300} className={`${input} mt-1`} /></label>
                    <ConfirmButton className={btnDanger} message="Mark this order as refunded? Return the money through Paystack or MoMo yourself — this only updates the record.">Mark refunded</ConfirmButton>
                  </form>
                </details>
              )}
              {o.payment_method === 'paystack' && <p className="mt-3 text-xs text-muted">Paystack payments are verified with Paystack on the server and marked paid automatically.</p>}
            </Panel>
          </div>

          <Panel className="h-full" title="History">
            <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line">
              {history.map((h, i) => (
                <li key={i} className="relative pl-6 text-sm">
                  <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 ${i === 0 ? 'border-gold bg-gold' : 'border-line bg-white'}`} />
                  <p className={i === 0 ? 'text-ink' : 'text-muted'}>{label(h.status)}</p>
                  {h.note && <p className="text-muted">{h.note}</p>}
                  <p className="text-xs text-muted">{fmt(h.created_at)}</p>
                </li>
              ))}
            </ol>

          </Panel>

        {/* Row 3 — delivery fee & notes | status (each sizes on its own) */}
          <Panel className="xl:self-start" title="Delivery fee & notes">
            <form action={updateOrderDetails} className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <input type="hidden" name="orderId" value={o.id} />
              <label className="text-xs text-muted">Delivery fee (GH₵)
                <input name="deliveryFee" type="number" min={0} step="0.01" placeholder="Leave blank if not agreed yet" defaultValue={o.delivery_fee_pesewas == null ? '' : o.delivery_fee_pesewas / 100} className={`${input} mt-1`} />
                <span className="mt-1 block text-[.68rem]">Blank = to be confirmed · 0 = free</span>
              </label>
              <label className="text-xs text-muted">Internal notes <span className="text-[.68rem]">(only staff see these)</span>
                <textarea name="adminNotes" rows={3} defaultValue={o.admin_notes || ''} placeholder="e.g. Customer prefers delivery after 4pm" className={`${input} mt-1 h-auto py-2`} />
              </label>
              <div className="sm:col-span-2"><SubmitButton className={btnDark}>Save changes</SubmitButton></div>
            </form>
          </Panel>

          {!cancelled && (
            <Panel className="xl:self-start" title="Update status">
              <details className="group rounded-lg border border-line">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm text-muted hover:text-ink">Change status or add a note <span className="inline-block transition-transform group-open:rotate-180">▾</span></summary>
                <div className="space-y-4 border-t border-line p-4">
                  <form action={updateOrderStatus} className="space-y-3">
                    <input type="hidden" name="orderId" value={o.id} />
                    <label className="block text-xs text-muted">Status
                      <select name="status" defaultValue={o.status} className={`${input} mt-1`}>{ORDER_STATUSES.filter((s) => s.value !== 'cancelled').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                    </label>
                    <label className="block text-xs text-muted">Note (optional)<input name="note" maxLength={500} className={`${input} mt-1`} placeholder="e.g. Rider dispatched" /></label>
                    <SubmitButton className={`${btnDark} w-full`}>Update</SubmitButton>
                  </form>
                  <form action={updateOrderStatus} className="border-t border-line pt-4">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <ConfirmButton className={`${btnDanger} w-full`} message={`Cancel order ${o.order_number}? Tracked stock goes back to inventory. This can't be undone.`}>Cancel order</ConfirmButton>
                    <p className="mt-2 text-[.68rem] text-muted">Returns tracked stock to inventory. Can&apos;t be undone.</p>
                  </form>
                </div>
              </details>
            </Panel>
          )}
      </div>
    </div>
  );
}

function Panel({ title, aside, children, className = '' }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-white p-6 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-light">{title}</h2>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Figure({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'warn' | 'good' }) {
  return (
    <div className={`rounded-xl border bg-white p-5 ${tone === 'warn' ? 'border-gold/60' : tone === 'good' ? 'border-[#1F7A4D]/30' : 'border-line'}`}>
      <p className="text-[.62rem] uppercase tracking-[.22em] text-muted">{label}</p>
      <p className={`mt-2 font-serif text-[1.8rem] leading-none ${tone === 'warn' ? 'text-gold-deep' : tone === 'good' ? 'text-[#1F7A4D]' : 'text-ink'}`}>{value}</p>
      <p className="mt-2 truncate text-xs text-muted">{hint}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right text-ink">{v}</dd>
    </div>
  );
}
