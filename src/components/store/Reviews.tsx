'use client';

import { useState, useTransition } from 'react';
import type { Review } from '@/lib/types';
import { submitReview } from '@/app/actions/reviews';
import { Stars } from './ProductDetail';
import { StoriesSlider } from './StoriesSlider';

export function Reviews({ productSlug, productName, reviews, enabled }: { productSlug: string; productName: string; reviews: Review[]; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  return (
    <section className="border-t border-line py-[clamp(60px,8vw,110px)]" id="reviews" aria-labelledby="reviewsTitle">
      <div className="container grid gap-12 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="eyebrow">Customer Reviews</p>
          <h2 id="reviewsTitle" className="font-serif text-[clamp(2rem,3.4vw,3rem)] font-light leading-tight text-ink">
            {reviews.length ? <>{avg.toFixed(1)} <em className="text-gold-deep">out of 5</em></> : <>Loved across <em className="text-gold-deep">Ghana.</em></>}
          </h2>
          {reviews.length > 0 && <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Stars value={avg} size={16} /> Based on {reviews.length} verified review{reviews.length === 1 ? '' : 's'}</p>}
          {reviews.length === 0 && (
            <p className="mt-4 max-w-sm text-muted">{productName} hasn&apos;t been reviewed yet — here&apos;s what clients say about shopping with Classy Luxe.</p>
          )}
          <p className="mt-4 max-w-sm text-sm text-muted">Product reviews come from customers whose order was delivered. You&apos;ll need your order number and the phone number you ordered with.</p>
          {enabled && !open && <button className="btn btn-outline mt-6" onClick={() => setOpen(true)}>Write a Review</button>}
        </div>

        <div>
          {open && (
            <form className="mb-12 grid gap-4 border border-line bg-ivory p-6 sm:grid-cols-2" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const form = e.currentTarget;
              start(async () => {
                const r = await submitReview({
                  productSlug,
                  orderNumber: String(fd.get('orderNumber') || ''),
                  phone: String(fd.get('phone') || ''),
                  name: String(fd.get('name') || ''),
                  rating,
                  body: String(fd.get('body') || '')
                });
                setMsg({ ok: r.ok, text: r.message });
                if (r.ok) { form.reset(); setOpen(false); }
              });
            }}>
              <h3 className="font-serif text-2xl text-ink sm:col-span-2">Review {productName}</h3>
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-[.68rem] uppercase tracking-[.2em] text-muted">Your rating</legend>
                <div className="flex gap-1" role="radiogroup">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <label key={i} className="cursor-pointer text-gold">
                      <input type="radio" name="rating" className="sr-only" checked={rating === i} onChange={() => setRating(i)} aria-label={`${i} star${i > 1 ? 's' : ''}`} />
                      <svg width="28" height="28" viewBox="0 0 24 24" fill={rating >= i ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field"><label htmlFor="rvOrder">Order number</label><input id="rvOrder" name="orderNumber" placeholder="CL-1234" required /></div>
              <div className="field"><label htmlFor="rvPhone">Phone used on the order</label><input id="rvPhone" name="phone" type="tel" inputMode="tel" required /></div>
              <div className="field sm:col-span-2"><label htmlFor="rvName">Name to show</label><input id="rvName" name="name" maxLength={60} required placeholder="e.g. Ama O." /></div>
              <div className="field sm:col-span-2"><label htmlFor="rvBody">Your review</label><textarea id="rvBody" name="body" rows={4} minLength={10} maxLength={1500} required /></div>
              <div className="flex gap-3 sm:col-span-2">
                <button className="btn btn-dark" disabled={pending}>{pending ? 'Sending…' : 'Submit Review'}</button>
                <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
              </div>
            </form>
          )}
          {msg && <p role="status" className={`mb-8 text-sm ${msg.ok ? 'text-whatsapp' : 'text-danger'}`}>{msg.text}</p>}
          {reviews.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {reviews.map((r) => (
                <li key={r.id} className="py-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars value={r.rating} />
                    <time className="text-xs text-muted" dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                  </div>
                  <p className="mt-3 font-serif text-xl leading-snug text-ink">{r.body}</p>
                  <p className="mt-2 text-[.7rem] uppercase tracking-[.18em] text-muted">{r.customerName} · Verified purchase</p>
                </li>
              ))}
            </ul>
          ) : (
            <StoriesSlider />
          )}
        </div>
      </div>
    </section>
  );
}
