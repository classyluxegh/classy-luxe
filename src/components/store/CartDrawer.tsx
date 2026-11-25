'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { placeOrder, type CheckoutResult } from '@/app/actions/checkout';
import { money } from '@/lib/money';
import type { DeliveryOption } from '@/lib/types';
import { COLLECTIONS, REGIONS } from '@/lib/site';
import { CloseIcon, WhatsAppIcon } from './Icons';
import { ProductImage } from './ProductImage';
import { MAX_QTY, useStore } from './StoreProvider';
import { StockNote } from './StockNote';

type View = 'cart' | 'checkout' | 'done';
const CUSTOMER_KEY = 'classyluxe.customer.v2';

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
        <div className="drawer-head">
          <h2 id="cartTitle">Your Bag {count > 0 && <span>({count})</span>}</h2>
          <button className="icon-btn" aria-label="Close bag" onClick={closeDrawer} data-autofocus><CloseIcon /></button>
        </div>
        {effectiveView === 'done' && result ? (
          <Done result={result} onClear={() => { store.clear(); setResult(null); setView('cart'); store.notify('Thank you! Your bag has been cleared.'); }} onBack={() => { setResult(null); setView('cart'); }} />
        ) : !lines.length ? (
          <div className="drawer-body">
            <div className="cart-empty">
              <span className="ph-mark">CL</span>
              <h3>Your bag is empty</h3>
              <p>Discover a fragrance that feels like you.</p>
              <Link href="/shop" className="btn btn-dark" onClick={closeDrawer}>Explore Collection</Link>
            </div>
          </div>
        ) : effectiveView === 'checkout' ? (
          <Checkout onBack={() => setView('cart')} onDone={(r) => { setResult(r); setView('done'); }} />
        ) : (
          <>
            <div className="drawer-body">
              <ul>
                {lines.map((l) => (
                  <li key={l.variantId} className="line-item">
                    <div className="li-media"><ProductImage src={l.product.images[0]?.url} alt={l.product.name} sizes="84px" /></div>
                    <div className="li-info">
                      <p className="li-name"><Link href={`/product/${l.product.slug}`} onClick={closeDrawer}>{l.product.name}</Link></p>
                      <p className="li-meta">{[l.product.variantLabel, l.variant.label, COLLECTIONS[l.product.collection].name].filter(Boolean).join(' · ')}</p>
                      <p className="li-unit">{money(l.variant.pricePesewas)} each</p>
                      <div className="qty" role="group" aria-label={`Quantity for ${l.product.name}`}>
                        <button aria-label="Decrease quantity" disabled={l.quantity <= 1} onClick={() => store.setQuantity(l.variantId, l.quantity - 1)}>−</button>
                        <output aria-live="polite">{l.quantity}</output>
                        <button aria-label="Increase quantity" disabled={l.quantity >= Math.min(MAX_QTY, l.variant.stock ?? MAX_QTY)} onClick={() => store.setQuantity(l.variantId, l.quantity + 1)}>+</button>
                      </div>
                      {(!l.variant.inStock || (l.variant.stock !== null && l.variant.stock <= store.settings.lowStockThreshold)) && <StockNote variant={l.variant} className="mt-2" />}
                      {l.variant.stock !== null && l.quantity > l.variant.stock && <p className="field-error">Only {l.variant.stock} available — please reduce the quantity.</p>}
                    </div>
                    <div className="li-side">
                      <span className="li-total">{money(l.lineTotal)}</span>
                      <button className="li-remove" aria-label={`Remove ${l.product.name} from bag`} onClick={() => { store.remove(l.variantId); store.notify(`${l.product.name} removed from your bag`); }}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="drawer-foot">
              <div className="summary-row total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <p className="summary-note">Delivery within GCTU campus is free. Other delivery fees are shown at checkout or confirmed on WhatsApp.</p>
              <button className="btn btn-dark" onClick={() => setView('checkout')} disabled={lines.some((l) => !l.variant.inStock || (l.variant.stock !== null && l.quantity > l.variant.stock))}>Checkout</button>
              <button className="btn btn-outline" onClick={closeDrawer}>Continue Shopping</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Checkout({ onBack, onDone }: { onBack: () => void; onDone: (r: Extract<CheckoutResult, { ok: true }>) => void }) {
  const { lines, subtotal, deliveryRates, paystackEnabled } = useStore();
  const saved = typeof window !== 'undefined' ? safeRead() : {};
  const [delivery, setDelivery] = useState<DeliveryOption>((saved.delivery as DeliveryOption) || 'accra');
  const [region, setRegion] = useState<string>(saved.region || REGIONS[0]);
  const [payment, setPayment] = useState<'whatsapp' | 'paystack'>('whatsapp');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [pending, start] = useTransition();

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
    try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: input.name, phone: input.phone, email: input.email, delivery, region, location: input.location })); } catch { /* ignore */ }
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
        <form className="checkout" id="checkoutForm" onSubmit={submit} noValidate>
          <button type="button" className="link-btn checkout-back" onClick={onBack}>← Back to bag</button>
          <h3>Delivery details</h3>
          <ul className="checkout-review" aria-label="Order review">
            {lines.map((l) => (
              <li key={l.variantId}><span>{l.quantity} × {l.product.name}{l.variant.label ? ` (${l.variant.label})` : ''}</span><span>{money(l.lineTotal)}</span></li>
            ))}
          </ul>
          <Field id="name" label="Full name" autoComplete="name" defaultValue={saved.name} error={errors.name} />
          <Field id="phone" label="Phone / WhatsApp number" type="tel" autoComplete="tel" inputMode="tel" defaultValue={saved.phone} error={errors.phone} />
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="mb-2 text-[.68rem] uppercase tracking-[.2em] text-muted">Delivery</legend>
            <div className="delivery-options">
              {([['gctu', 'GCTU campus', 'Free delivery within the GCTU campus area'], ['accra', 'Within Accra', feeText('accra')], ['region', 'Another region', 'Nationwide · est. 1–3 business days']] as const).map(([v, t, s]) => (
                <label key={v}>
                  <input type="radio" name="delivery" value={v} checked={delivery === v} onChange={() => setDelivery(v)} />
                  <span>{t}<small>{s}</small></span>
                </label>
              ))}
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
          <Field id="location" label={delivery === 'gctu' ? 'Hostel / hall & room' : 'Delivery location (town, area, landmark)'} autoComplete="street-address" defaultValue={saved.location} error={errors.location} />
          <div className="field">
            <label htmlFor="notes">Order notes <small>(optional)</small></label>
            <textarea id="notes" name="notes" rows={3} placeholder="Gift wrapping, preferred delivery time…" maxLength={1000} />
          </div>
          {/* Honeypot for bots */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />

          {paystackEnabled && (
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="mb-2 text-[.68rem] uppercase tracking-[.2em] text-muted">Payment</legend>
              <div className="delivery-options">
                <label>
                  <input type="radio" name="payment" checked={pay === 'whatsapp'} onChange={() => setPayment('whatsapp')} />
                  <span>Confirm on WhatsApp<small>We confirm availability, delivery and payment with you</small></span>
                </label>
                <label style={!canPayOnline ? { opacity: 0.5 } : undefined}>
                  <input type="radio" name="payment" checked={pay === 'paystack'} disabled={!canPayOnline} onChange={() => setPayment('paystack')} />
                  <span>Pay now with Paystack<small>{canPayOnline ? 'Mobile Money, card or bank transfer' : 'Available once the delivery fee for this area is set'}</small></span>
                </label>
              </div>
            </fieldset>
          )}
          {pay === 'paystack' && <Field id="email" label="Email (for your Paystack receipt)" type="email" autoComplete="email" defaultValue={saved.email} error={errors.email} />}
          {formError && <p className="field-error" role="alert">{formError}</p>}
        </form>
      </div>
      <div className="drawer-foot">
        <div className="summary-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="summary-row"><span>Delivery</span><span>{fee === null ? 'Confirmed on WhatsApp' : fee === 0 ? 'Free' : money(fee)}</span></div>
        <div className="summary-row total"><span>{fee === null ? 'Total (excl. delivery)' : 'Total'}</span><strong>{money(subtotal + (fee ?? 0))}</strong></div>
        <p className="summary-note">
          {pay === 'paystack'
            ? 'You will be taken to Paystack to pay securely. Your order is confirmed once payment is verified.'
            : 'We save your order, then you send it to us on WhatsApp. It is confirmed once we reply with availability, delivery and payment details.'}
        </p>
        <button className="btn btn-dark btn-wa" type="submit" form="checkoutForm" disabled={pending}>
          {pending ? 'Placing order…' : pay === 'paystack' ? 'Continue to Payment' : <><WhatsAppIcon />Place Order &amp; Open WhatsApp</>}
        </button>
      </div>
    </>
  );

  function feeText(option: 'accra') {
    const r = deliveryRates.find((x) => x.option === option);
    return r?.feePesewas != null ? `Delivery ${money(r.feePesewas)}` : 'Delivery fee confirmed on WhatsApp';
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
  try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}'); } catch { return {}; }
}
