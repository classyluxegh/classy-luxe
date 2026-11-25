'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Category, Collection } from '@/lib/types';
import { minPrice } from '@/lib/types';
import { COLLECTIONS } from '@/lib/site';
import { ProductCard } from './ProductCard';
import { WaLink } from './WaLink';
import { SHOP_EVENT, type ShopFilter } from './ShopLink';
import { useStore } from './StoreProvider';

type Sort = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';
const PRICE_BANDS = [
  { v: 'all', label: 'Any price', min: 0, max: Infinity },
  { v: 'u100', label: 'Under GH₵ 100', min: 0, max: 9999 },
  { v: '100-250', label: 'GH₵ 100 – 250', min: 10000, max: 25000 },
  { v: '250-500', label: 'GH₵ 250 – 500', min: 25001, max: 50000 },
  { v: 'o500', label: 'Over GH₵ 500', min: 50001, max: Infinity }
] as const;

export function Shop({ categories }: { categories: Category[] }) {
  const { products } = useStore();
  const [collection, setCollection] = useState<'all' | Collection>('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<Sort>('featured');
  const [band, setBand] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Initial filter from the URL (?collection=…&category=…) and live updates from ShopLink
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const col = sp.get('collection');
    if (col === 'student' || col === 'general') setCollection(col);
    const cat = sp.get('category');
    if (cat && categories.some((c) => c.slug === cat)) setCategory(cat);
    const onFilter = (e: Event) => {
      const d = (e as CustomEvent<ShopFilter>).detail;
      setCollection(d.collection || 'all');
      setCategory(d.category || 'all');
      setQuery(''); setDebounced('');
    };
    window.addEventListener(SHOP_EVENT, onFilter);
    return () => window.removeEventListener(SHOP_EVENT, onFilter);
  }, [categories]);

  useEffect(() => { const t = setTimeout(() => setDebounced(query), 140); return () => clearTimeout(t); }, [query]);

  const list = useMemo(() => {
    const words = debounced.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const range = PRICE_BANDS.find((b) => b.v === band) || PRICE_BANDS[0];
    const out = products.filter((p) => {
      if (collection !== 'all' && p.collection !== collection) return false;
      if (category !== 'all' && p.category.slug !== category) return false;
      const price = minPrice(p);
      if (price < range.min || price > range.max) return false;
      if (inStockOnly && !p.available) return false;
      if (!words.length) return true;
      const hay = [p.name, p.variantLabel, p.notes.join(' '), p.description, p.category.name, COLLECTIONS[p.collection].name, p.variants.map((v) => v.label).join(' ')].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    if (sort === 'featured') out.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    if (sort === 'newest') out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (sort === 'price-asc') out.sort((a, b) => minPrice(a) - minPrice(b));
    if (sort === 'price-desc') out.sort((a, b) => minPrice(b) - minPrice(a));
    if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [products, collection, category, debounced, sort, band, inStockOnly]);

  const countFor = (slug: string) => products.filter((p) => p.category.slug === slug && (collection === 'all' || p.collection === collection)).length;
  const reset = () => { setCollection('all'); setCategory('all'); setQuery(''); setDebounced(''); setBand('all'); setInStockOnly(false); };
  const catName = categories.find((c) => c.slug === category)?.name;

  return (
    <>
      <div className="shop-toolbar">
        <div className="collection-switch" role="tablist" aria-label="Collection">
          {(['all', 'student', 'general'] as const).map((c) => (
            <button key={c} role="tab" className="seg" aria-selected={collection === c} onClick={() => setCollection(c)}>
              {c === 'all' ? 'All' : COLLECTIONS[c].name}
            </button>
          ))}
        </div>
        <div className="shop-tools">
          <label className="search">
            <span className="sr-only">Search products</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or note — e.g. vanilla" autoComplete="off" />
          </label>
          <label className="sort">
            <span className="sr-only">Sort products</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="featured">Sort: Featured</option>
              <option value="newest">Newest arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name: A – Z</option>
            </select>
          </label>
        </div>
      </div>

      <div className="category-chips" role="group" aria-label="Filter by category">
        <button className="chip" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
          All<span className="n">{products.filter((p) => collection === 'all' || p.collection === collection).length}</span>
        </button>
        {categories.map((c) => (
          <button key={c.id} className="chip" aria-pressed={category === c.slug} onClick={() => setCategory(c.slug)}>
            {c.name}<span className="n">{countFor(c.slug)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-1 pt-3">
        <label className="flex items-center gap-3 text-[.78rem] text-muted">
          <span className="text-[.66rem] uppercase tracking-[.2em]">Price</span>
          <select value={band} onChange={(e) => setBand(e.target.value)} className="h-9 border border-line bg-ivory-2 px-3 text-sm text-ink outline-none focus:border-gold">
            {PRICE_BANDS.map((b) => <option key={b.v} value={b.v}>{b.label}</option>)}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="h-4 w-4 accent-[#0F0D0B]" />
          In stock only
        </label>
        {(band !== 'all' || inStockOnly || category !== 'all' || collection !== 'all' || debounced) && (
          <button className="link-btn" onClick={reset}>Clear all filters</button>
        )}
      </div>

      <p className="result-count" aria-live="polite">
        {list.length} product{list.length === 1 ? '' : 's'}
        {collection !== 'all' && ` · ${COLLECTIONS[collection].name}`}
        {catName && ` · ${catName}`}
      </p>

      <div className="product-grid">
        {list.length ? (
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((p, i) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="flex *:w-full">
                <ProductCard product={p} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="empty-state">
            <div className="empty-state-visual" aria-hidden="true">CL</div>
            <div className="empty-state-copy">
              {debounced.trim() ? (
                <>
                  <h3>No matches for “{debounced.trim()}”</h3>
                  <p>Try a different name or a scent note like vanilla, oud or rose — or ask us and we&apos;ll help you find it.</p>
                  <div className="empty-state-actions">
                    <button className="btn btn-gold" onClick={reset}>Clear search</button>
                    <WaLink className="btn btn-ghost-light" text={`Hello Classy Luxe! Do you have "${debounced.trim()}"?`}>Ask on WhatsApp</WaLink>
                  </div>
                </>
              ) : (
                <>
                  <h3>{catName || 'This selection'}{collection !== 'all' ? ` in the ${COLLECTIONS[collection].name}` : ''}</h3>
                  <p>We carry {catName || 'these products'} in store, but they aren&apos;t listed online yet. Message us on WhatsApp for current options, prices and availability.</p>
                  <div className="empty-state-actions">
                    <WaLink className="btn btn-gold" text={`Hello Classy Luxe! I'd like to see your ${catName || ''} options and prices.`}>Enquire on WhatsApp</WaLink>
                    <button className="btn btn-ghost-light" onClick={reset}>View all products</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
