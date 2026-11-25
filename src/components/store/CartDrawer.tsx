'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { placeOrder, type CheckoutResult } from '@/app/actions/checkout';
import { money } from '@/lib/money';
import type { DeliveryOption } from '@/lib/types';
import { COLLECTIONS, REGIONS } from '@/lib/site';
import { BagIcon, CloseIcon, WhatsAppIcon } from './Icons';
import { ProductImage } from './ProductImage';
import { MAX_QTY, useStore } from './StoreProvider';
import { StockNote } from './StockNote';
import { QtyInput } from './QtyInput';

type View = 'cart' | 'checkout' | 'done';
const OLD_CUSTOMER_KEY = 'classyluxe.customer.v2';
/** Checkout details typed so far. Kept in memory only: cleared when the page reloads. */
let typedDetails: Record<string, string> = {};
if (typeof window !== 'undefined') { try { localStorage.removeItem(OLD_CUSTOMER_KEY); } catch { /* ignore */ } } // forget details saved by earlier versions

export function CartDrawer() {
  const store = useStore();
  const { drawerOpen, closeDrawer, lines, count, subtotal } = store;
  const [view, setView] = useState<View>('cart');
  const [result, setResult] = useState<Extract<CheckoutResult, { ok: true }> | null>(null);
  const panel = useRef<HTMLElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', drawerOpen);
    document.body.classList.toggle('locked', drawerOpen);
    if (!drawerOpen) { lastFocus.current?.focus?.(); return; }
    lastFocus.current = document.activeElement as HTMLElement;
    if (view === 'done' && !result) setView('cart');
    setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
      if (e.key !== 'Tab' || !panel.current) return;
      const f = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea')).filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  const effectiveView: View = view === 'done' ? 'done' : lines.length ? view : 'cart';

  return (
    <>
      <div className={`overlay${drawerOpen ? ' show' : ''}`} hidden={!drawerOpen} onClick={closeDrawer} />
      <aside ref={panel} className={`drawer${drawerOpen ? ' open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="cartTitle" aria-hidden={!drawerOpen}>
        {effectiveView === 'done' && result ? (
          <>
            <DrawerHead icon={<BagIcon />} title="Your bag" subtitle={`Order ${result.orderNumber}`} onClose={closeDrawer} />
            <Done result={result} onClear={() => { store.clear(); setResult(null); setView('cart'); store.notify('Thank you! Your bag has been cleared.'); }} onBack={() => { setResult(null); setView('cart'); }} />
          </>
        ) : !lines.length ? (
          <>
            <DrawerHead icon={<BagIcon />} title="Your bag" subtitle="0 items" onClose={closeDrawer} />
            <div className="drawer-body">
              <div className="cart-empty">
                <span className="ph-mark">CL</span>
                <h3>Your bag is empty</h3>
                <p>Discover a fragrance that feels like you.</p>
                <Link href="/shop" className="btn btn-dark" onClick={closeDrawer}>Explore Collection</Link>
              </div>
            </div>
          </>
        ) : effectiveView === 'checkout' ? (
          <>
            <DrawerHead
              back={() => setView('cart')}
              title="Your details"
              subtitle="Where should we deliver your order?"
              onClose={closeDrawer}
            />
            <Checkout onDone={(r) => { setResult(r); setView('done'); }} />
          </>
        ) : (
          <>
            <DrawerHead icon={<BagIcon />} title="Your bag" subtitle={`${count} item${count === 1 ? '' : 's'}`} onClose={closeDrawer} />
            <div className="drawer-body pb-8">
              <div className="flex items-center justify-between pb-3 pt-5">
                <span className="text-[.68rem] font-medium uppercase tracking-[.24em] text-muted">Items</span>
                <button
                  type="button"
                  className="text-[.78rem] text-danger transition-opacity hover:opacity-70"
                  onClick={() => { if (window.confirm('Remove all items from your bag?')) { store.clear(); store.notify('Your bag has been cleared.'); } }}
                >
                  Clear all
                </button>
              </div>
              <ul className="border-t border-line">
                {lines.map((l) => {
                  const overStock = l.variant.stock !== null && l.quantity > l.variant.stock;
                  const lowOrOut = !l.variant.inStock || (l.variant.stock !== null && l.variant.stock <= store.settings.lowStockThreshold);
                  return (
                    <li key={l.variantId} className="border-b border-line py-4">
                      <div className="grid grid-cols-[56px_minmax(0,1fr)_auto_auto] items-center gap-3">
                        <div className="relative h-14 w-14 overflow-hidden rounded-md border border-line bg-beige">
                          <ProductImage src={l.product.images[0]?.url} alt={l.product.name} sizes="56px" />
                        </div>
                        <div className="min-w-0">
                          <Link href={`/product/${l.product.slug}`} onClick={closeDrawer} className="block truncate text-[.92rem] font-medium text-ink hover:text-gold-deep">{l.product.name}</Link>
                          <p className="truncate text-[.76rem] text-muted">{[l.product.variantLabel, l.variant.label, COLLECTIONS[l.product.collection].name].filter(Boolean).join(' · ')}</p>
                          <p className="mt-0.5 text-[.88rem] font-medium text-gold-deep">{money(l.lineTotal)}</p>
                        </div>
                        <QtyInput
                          value={l.quantity}
                          onChange={(n) => store.setQuantity(l.variantId, n)}
                          max={Math.min(MAX_QTY, l.variant.stock ?? MAX_QTY)}
                          label={`Quantity for ${l.product.name}`}
                          className="qty-pill"
                        />
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-beige hover:text-ink"
                          aria-label={`Remove ${l.product.name} from bag`}
                          onClick={() => { store.remove(l.variantId); store.notify(`${l.product.name} removed from your bag`); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                      </div>
                      {lowOrOut && <StockNote variant={l.variant} className="ml-[68px] mt-2" />}
                      {overStock && <p className="field-error ml-[68px] mt-1">Only {l.variant.stock} available — please reduce the quantity.</p>}
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-baseline justify-between pb-5 pt-6">
                <span className="text-sm text-muted">Subtotal</span>
                <span className="font-serif text-2xl text-ink">{money(subtotal)}</span>
              </div>
              <button
                className="btn btn-dark w-full rounded-md"
                onClick={() => setView('checkout')}
                disabled={lines.some((l) => !l.variant.inStock || (l.variant.stock !== null && l.quantity > l.variant.stock))}
              >
                <BagIcon />Checkout
              </button>
              <p className="mx-auto mt-4 max-w-[34ch] text-center text-[.82rem] leading-relaxed text-muted">
                Add your details on the next step. We confirm availability, delivery and payment with you on WhatsApp.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Checkout({ onDone }: { onDone: (r: Extract<CheckoutResult, { ok: true }>) => void }) {
  const { lines, subtotal, deliveryRates, paystackEnabled } = useStore();
  const saved = typeof window !== 'undefined' ? safeRead() : {};
  const [delivery, setDelivery] = useState<DeliveryOption>((saved.delivery as DeliveryOption) || 'accra');
  const [region, setRegion] = useState<string>(saved.region || REGIONS[0]);
  const [payment, setPayment] = useState<'whatsapp' | 'paystack'>('whatsapp');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [pending, start] = useTransition();
  useEffect(() => { typedDetails = { ...typedDetails, delivery, region }; }, [delivery, region]);

  const rate = deliveryRates.find((r) => r.option === delivery && (delivery !== 'region' || r.region === region));
  const fee = delivery === 'gctu' ? (rate?.feePesewas ?? 0) : rate?.feePesewas ?? null;
  const canPayOnline = paystackEnabled && fee !== null;
  const pay = canPayOnline ? payment : 'whatsapp';

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get('name') || ''),
      phone: String(fd.get('phone') || ''),
      email: String(fd.get('email') || ''),
      delivery,
      region: delivery === 'region' ? region : '',
      location: String(fd.get('location') || ''),
      notes: String(fd.get('notes') || ''),
      website: String(fd.get('website') || ''),
      payment: pay,
      items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }))
    };
    typedDetails = { name: input.name, phone: input.phone, email: input.email, delivery, region, location: input.location };
    setFormError('');
    start(async () => {
      const r = await placeOrder(input);
      if (!r.ok) {
        setErrors(r.fieldErrors || {});
        setFormError(r.error);
        return;
      }
      setErrors({});
      if (r.paystackUrl) { window.location.href = r.paystackUrl; return; }
      onDone(r);
    });
  }

  return (
    <>
      <div className="drawer-body">
        <form
          className="checkout"
          id="checkoutForm"
          onSubmit={submit}
          noValidate
          onChange={(e) => {
            // remember what's typed while the bag is open (cleared on reload)
            const fd = new FormData(e.currentTarget);
            typedDetails = { ...typedDetails, name: String(fd.get('name') ?? ''), phone: String(fd.get('phone') ?? ''), email: String(fd.get('email') ?? typedDetails.email ?? ''), location: String(fd.get('location') ?? '') };
          }}
        >
          {/* order summary */}
          <section className="rounded-md border border-line bg-ivory p-5" aria-label="Order summary">
            <h3 className="mb-3 text-[.68rem] font-medium uppercase tracking-[.22em] text-muted">Order summary · {lines.reduce((n, l) => n + l.quantity, 0)} item{lines.reduce((n, l) => n + l.quantity, 0) === 1 ? '' : 's'}</h3>
            <ul className="space-y-1.5">
              {lines.map((l) => (
                <li key={l.variantId} className="flex justify-between gap-4 text-[.88rem]">
                  <span className="min-w-0 truncate text-ink"><strong className="font-medium">{l.quantity} ×</strong> {l.product.name}{l.variant.label ? ` (${l.variant.label})` : ''}</span>
                  <span className="whitespace-nowrap text-text">{money(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 border-t border-line pt-3 text-[.85rem]">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between text-muted"><span>Delivery</span><span>{fee === null ? 'Confirmed on WhatsApp' : fee === 0 ? 'Free' : money(fee)}</span></div>
              <div className="flex items-baseline justify-between pt-1 text-ink"><span>{fee === null ? 'Total (excl. delivery)' : 'Total'}</span><strong className="font-serif text-xl font-normal">{money(subtotal + (fee ?? 0))}</strong></div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Your name" autoComplete="name" placeholder="e.g. Ama Owusu" defaultValue={saved.name} error={errors.name} />
            <Field id="phone" label="Phone / WhatsApp" type="tel" autoComplete="tel" inputMode="tel" placeholder="e.g. 024 000 0000" defaultValue={saved.phone} error={errors.phone} />
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-[.68rem] uppercase tracking-[.2em] text-muted">Delivery</legend>
            <div className="delivery-options">
              <OptionCard name="delivery" checked={delivery === 'gctu'} onSelect={() => setDelivery('gctu')}
                title="GCTU campus" note="Free delivery within the GCTU campus area" aside={feeLabel('gctu')} />
              <OptionCard name="delivery" checked={delivery === 'accra'} onSelect={() => setDelivery('accra')}
                title="Within Accra" note="Delivered anywhere in Accra" aside={feeLabel('accra')} />
              <OptionCard name="delivery" checked={delivery === 'region'} onSelect={() => setDelivery('region')}
                title="Another region" note="Nationwide · est. 1–3 business days" aside={feeLabel('region')} />
            </div>
          </fieldset>
          {delivery === 'region' && (
            <div className="field">
              <label htmlFor="region">Region</label>
              <select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}
          <Field
            id="location"
            label={delivery === 'gctu' ? 'Hostel / hall & room' : 'Delivery location (town, area, landmark)'}
            autoComplete="street-address"
            placeholder={delivery === 'gctu' ? 'e.g. Unidaz Hostel, Room 102' : delivery === 'accra' ? 'e.g. Osu, near Koala supermarket' : 'e.g. Adum, Kumasi — near Kejetia'}
            defaultValue={saved.location}
            error={errors.location}
          />
          <div className="field">
            <label htmlFor="notes">Order notes <small>(optional)</small></label>
            <textarea id="notes" name="notes" rows={3} placeholder="Gift wrapping, preferred delivery time…" maxLength={1000} />
          </div>
          {/* Honeypot for bots */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />

          {paystackEnabled && (
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 text-[.68rem] uppercase tracking-[.2em] text-muted">Payment</legend>
              <div className="delivery-options">
                <OptionCard name="payment" checked={pay === 'whatsapp'} onSelect={() => setPayment('whatsapp')}
                  title="Confirm on WhatsApp" note="We confirm availability, delivery and payment with you" />
                <OptionCard name="payment" checked={pay === 'paystack'} disabled={!canPayOnline} onSelect={() => setPayment('paystack')}
                  title="Pay now with Paystack" note={canPayOnline ? 'Mobile Money, card or bank transfer' : 'Available once the delivery fee for this area is set'} />
              </div>
            </fieldset>
          )}
          {pay === 'paystack' && <Field id="email" label="Email (for your Paystack receipt)" type="email" autoComplete="email" placeholder="e.g. ama@gmail.com" defaultValue={saved.email} error={errors.email} />}
          {formError && <p className="field-error" role="alert">{formError}</p>}

          <button className="btn btn-dark btn-wa mt-2 w-full rounded-md" type="submit" disabled={pending}>
            {pending ? 'Placing order…' : pay === 'paystack' ? 'Continue to Payment' : <><WhatsAppIcon />Send Order on WhatsApp</>}
          </button>
          <p className="-mt-1 text-center text-[.8rem] leading-relaxed text-muted">
            {pay === 'paystack'
              ? 'You will be taken to Paystack to pay securely. Your order is confirmed once payment is verified.'
              : 'We save your order, then you send it to us on WhatsApp. It is confirmed once we reply.'}
          </p>
        </form>
      </div>
    </>
  );

  /** Fee shown on each delivery card: Free / the fee you set in Admin → Delivery fees / "On WhatsApp". */
  function feeLabel(option: DeliveryOption): { text: string; muted?: boolean } {
    const r = deliveryRates.find((x) => x.option === option && (option !== 'region' || x.region === region));
    const f = option === 'gctu' ? (r?.feePesewas ?? 0) : r?.feePesewas ?? null;
    if (f === 0) return { text: 'Free' };
    if (f === null) return { text: 'Fee on WhatsApp', muted: true };
    return { text: money(f) };
  }
}

function Done({ result, onClear, onBack }: { result: Extract<CheckoutResult, { ok: true }>; onClear: () => void; onBack: () => void }) {
  return (
    <>
      <div className="drawer-body">
        <div className="handoff">
          <span className="ph-mark" aria-hidden="true">✓</span>
          <h3>Order {result.orderNumber} is saved</h3>
          <p>Send it to us on WhatsApp to complete it. Your order isn&apos;t confirmed until we reply.</p>
          <ol>
            <li>Tap the button below and send the message.</li>
            <li>We confirm availability{result.feeKnown ? '' : ', delivery fee'} and payment.</li>
            <li>Your order is confirmed once we reply.</li>
          </ol>
        </div>
      </div>
      <div className="drawer-foot">
        <a className="btn btn-dark btn-wa" href={result.whatsappUrl} target="_blank" rel="noopener noreferrer"><WhatsAppIcon />Send Order on WhatsApp</a>
        <button className="btn btn-outline" onClick={onClear}>I&apos;ve sent it — clear my bag</button>
        <button className="btn btn-outline" onClick={onBack}>Back to my bag</button>
      </div>
    </>
  );
}

function Field({ id, label, error, ...rest }: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`field${error ? ' invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} type="text" aria-invalid={!!error} aria-describedby={error ? `${id}Err` : undefined} {...rest} />
      {error && <p className="field-error" id={`${id}Err`}>{error}</p>}
    </div>
  );
}

function safeRead(): Record<string, string> {
  return typedDetails;
}

/** A selectable card used for delivery and payment choices. */
function OptionCard({ name, checked, disabled, onSelect, title, note, aside }: {
  name: string; checked: boolean; disabled?: boolean; onSelect: () => void;
  title: string; note: string; aside?: { text: string; muted?: boolean };
}) {
  return (
    <label className="opt-card">
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onSelect} className="sr-only" />
      <span className="opt-dot" aria-hidden="true" />
      <span>
        <span className="opt-title">{title}</span>
        <span className="opt-note">{note}</span>
      </span>
      {aside && <span className={`opt-aside${aside.muted ? ' muted' : ''}`}>{aside.text}</span>}
    </label>
  );
}

/** Drawer header: icon (or back button), title + subtitle, close button. */
function DrawerHead({ icon, back, title, subtitle, onClose }: { icon?: React.ReactNode; back?: () => void; title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-4 border-b border-line px-6 py-5 max-[720px]:px-5">
      {back ? (
        <button type="button" onClick={back} aria-label="Back to bag" className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line text-lg text-ink transition-colors hover:border-ink hover:bg-ink hover:text-ivory">←</button>
      ) : (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-gold/15 text-gold-deep" aria-hidden="true">{icon}</span>
      )}
      <div className="min-w-0 flex-1">
        <h2 id="cartTitle" className="font-serif text-[1.65rem] leading-none text-ink">{title}</h2>
        <p className="mt-1 truncate text-[.8rem] text-muted">{subtitle}</p>
      </div>
      <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-beige/70 text-ink transition-colors hover:bg-ink hover:text-ivory" aria-label="Close bag" onClick={onClose} data-autofocus>
        <CloseIcon />
      </button>
    </div>
  );
}
