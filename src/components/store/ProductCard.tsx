'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { minPrice } from '@/lib/types';
import { money } from '@/lib/money';
import { COLLECTIONS } from '@/lib/site';
import { ProductImage } from './ProductImage';
import { useStore } from './StoreProvider';
import { stockText } from './StockNote';

export function ProductCard({ product: p, index = 0, dark }: { product: Product; index?: number; dark?: boolean }) {
  const { add, settings } = useStore();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const href = `/product/${p.slug}`;
  const multi = p.variants.length > 1;
  const single = p.variants.find((v) => v.inStock) || p.variants[0];
  const stock = stockText(single, settings.lowStockThreshold);

  function onAdd() {
    if (multi) return router.push(href);
    add(single.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className="card" style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}>
      <div className="card-media">
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <ProductImage src={p.images[0]?.url} alt={p.images[0]?.alt || p.name} name={p.name} dark={dark}
            sizes="(max-width: 720px) 50vw, (max-width: 1180px) 33vw, 25vw" className="object-cover" />
        </Link>
        {!p.available
          ? <span className="card-badge !bg-ink !text-ivory">Out of stock</span>
          : !multi && stock.tone === 'low'
            ? <span className="card-badge !bg-gold !text-ink">{stock.text}</span>
            : p.badge && <span className={`card-badge${p.badge === 'New Arrival' ? ' new' : ''}`}>{p.badge}</span>}
        {p.available && <button className="card-quick" onClick={onAdd}>{multi ? 'Choose size' : added ? 'Added ✓' : 'Quick add'}</button>}
      </div>
      <div className="card-body">
        <p className="card-meta">{COLLECTIONS[p.collection].short} · {p.category.name}</p>
        <h3 className="card-name">
          <Link href={href}>{p.name}</Link>
          {p.variantLabel && <small>{p.variantLabel}</small>}
        </h3>
        {p.notes.length > 0 && <p className="card-notes">{p.notes.join(' · ')}</p>}
        <div className="card-foot">
          <span className="price">
            {multi ? 'From ' : ''}{money(minPrice(p))}
            {!multi && single.label && <small>{single.label}</small>}
          </span>
          {p.available
            ? <button className="card-add" onClick={onAdd}>{added ? 'Added ✓' : multi ? 'Choose size' : 'Add to Bag'}</button>
            : <Link className="card-add" href={href}>View details</Link>}
        </div>
      </div>
    </article>
  );
}
