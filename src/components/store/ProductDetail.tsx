'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { displayName } from '@/lib/types';
import { money } from '@/lib/money';
import { COLLECTIONS, waLink } from '@/lib/site';
import { ProductImage } from './ProductImage';
import { ShopLink } from './ShopLink';
import { WhatsAppIcon } from './Icons';
import { StockNote } from './StockNote';
import { MAX_QTY, useStore } from './StoreProvider';
import { QtyInput } from './QtyInput';
import { BackButton } from './BackButton';

export function ProductDetail({ product: p, rating }: { product: Product; rating?: { average: number; count: number } }) {
  const { add, settings } = useStore();
  const firstAvailable = p.variants.find((v) => v.inStock) || p.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const v = p.variants.find((x) => x.id === variantId) || firstAvailable;
  const multi = p.variants.length > 1;
  const maxQty = Math.min(MAX_QTY, v.stock ?? MAX_QTY);
  const img = p.images[imgIndex];

  const waText = v.inStock
    ? `Hello ${settings.businessName}! I'd like to order:\n\n*${displayName(p)}*${v.label ? ` (${v.label})` : ''} — ${COLLECTIONS[p.collection].name}\nQuantity: ${qty}\nPrice: ${qty} × ${money(v.pricePesewas)} = ${money(v.pricePesewas * qty)}\n\nMy name: \nMy delivery location: \n\nPlease confirm availability, delivery and payment. Thank you!`
    : `Hello ${settings.businessName}! When will ${displayName(p)}${v.label ? ` (${v.label})` : ''} be back in stock?`;

  return (
    <div className="pdp-hero">
      <div className="flex min-w-0 flex-col">
        <div className="pdp-media flex-1">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div key={imgIndex} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <ProductImage src={img?.url} alt={img?.alt || displayName(p)} name={p.name} sizes="(max-width: 1024px) 100vw, 55vw" priority={imgIndex === 0} />
            </motion.div>
          </AnimatePresence>
          {p.badge && <span className={`card-badge${p.badge === 'New Arrival' ? ' new' : p.badge === 'Bestseller' ? ' best' : ''}`}>{p.badge}</span>}
        </div>
        {p.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto bg-ivory p-3" role="group" aria-label="Product images">
            {p.images.map((im, i) => (
              <button key={im.url} onClick={() => setImgIndex(i)} aria-label={`Show image ${i + 1} of ${p.images.length}`} aria-pressed={i === imgIndex}
                className={`relative h-20 w-16 shrink-0 overflow-hidden border transition ${i === imgIndex ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <ProductImage src={im.url} alt="" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pdp-info">
        <BackButton className="-mb-2 self-start" />
        <nav className="crumbs" aria-label="Breadcrumb">
          <ShopLink>Shop</ShopLink><span aria-hidden="true">/</span>
          <ShopLink collection={p.collection}>{COLLECTIONS[p.collection].name}</ShopLink><span aria-hidden="true">/</span>
          <ShopLink category={p.category.slug}>{p.category.name}</ShopLink>
        </nav>
        <h1 className="pdp-title">{p.name}{p.variantLabel && <small>{p.variantLabel}</small>}</h1>
        {rating && rating.count > 0 && (
          <a href="#reviews" className="-mt-2 flex items-center gap-2 text-sm text-muted hover:text-ink">
            <Stars value={rating.average} /> {rating.average.toFixed(1)} · {rating.count} review{rating.count === 1 ? '' : 's'}
          </a>
        )}
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <p className="pdp-price">{money(v.pricePesewas)}{v.label && <small>{v.label}</small>}</p>
          <StockNote variant={v} />
        </div>
        {p.description
          ? <p className="pdp-desc">{p.description}</p>
          : <p className="pdp-desc pending">Full description coming soon — message us on WhatsApp for details about this product.</p>}
        {p.notes.length > 0 && (
          <div className="notes-pyramid"><h3>Key notes</h3><ul className="note-list">{p.notes.map((n) => <li key={n}>{n}</li>)}</ul></div>
        )}
        {v.label && (
          <div className="pdp-block">
            <h3>Size</h3>
            {multi ? (
              <div className="size-options" role="group" aria-label="Choose size">
                {p.variants.map((x) => (
                  <button key={x.id} aria-pressed={x.id === variantId} onClick={() => { setVariantId(x.id); setQty(1); }} disabled={!x.inStock}
                    className="disabled:cursor-not-allowed disabled:line-through disabled:opacity-50">
                    {x.label} · {money(x.pricePesewas)}
                  </button>
                ))}
              </div>
            ) : <span className="size-single">{v.label}</span>}
          </div>
        )}
        {v.inStock ? (
          <div className="pdp-actions">
            <QtyInput value={qty} onChange={setQty} max={maxQty} size="lg" />
            <motion.button whileTap={{ scale: 0.97 }} className="btn btn-dark" onClick={() => { add(v.id, qty); setAdded(true); setTimeout(() => setAdded(false), 1400); }}>
              {added ? 'Added to Bag ✓' : 'Add to Bag'}
            </motion.button>
            <a className="btn btn-outline btn-wa-full" href={waLink(settings.whatsappNumber, waText)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon />Order via WhatsApp</a>
          </div>
        ) : (
          <div className="pdp-actions"><a className="btn btn-dark btn-wa-full" href={waLink(settings.whatsappNumber, waText)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon />Ask About Restock</a></div>
        )}
        <ul className="pdp-facts">
          <li>{COLLECTIONS[p.collection].name} · {p.category.name}</li>
          <li>Nationwide delivery to all 16 regions</li>
          <li>Free delivery within GCTU campus</li>
          <li>Authentic fragrance from trusted suppliers</li>
        </ul>
      </div>
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex text-gold" aria-label={`${value.toFixed(1)} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={value >= i - 0.25 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2">
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </svg>
      ))}
    </span>
  );
}
