'use client';

import { useRef, useState } from 'react';
import type { Product } from '@/lib/types';
import { minPrice } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { WaLink } from './WaLink';
import { useStore } from './StoreProvider';

const MOODS = {
  warm: { label: 'Warm & Sweet', hint: 'Vanilla · Saffron · Amber · Praline', words: ['vanilla', 'praline', 'amber', 'saffron', 'spice', 'ginger', 'heliotrope', 'gourmand'] },
  fresh: { label: 'Fresh & Vibrant', hint: 'Bergamot · Citrus · Mint · Pineapple', words: ['bergamot', 'citrus', 'mint', 'aquatic', 'pineapple', 'apple', 'basil', 'fresh'] },
  floral: { label: 'Floral & Fruity', hint: 'Rose · Berries · Lavender · Fruits', words: ['rose', 'floral', 'berr', 'fruit', 'blackcurrant', 'lavender', 'tropical'] },
  woody: { label: 'Woody & Oud', hint: 'Oud · Cedarwood · Musk · Patchouli', words: ['oud', 'cedar', 'musk', 'patchouli', 'sandalwood', 'ambergris', 'wood', 'cardamom'] }
} as const;
type Mood = keyof typeof MOODS;
const BUDGETS = [
  { v: 'any', label: 'Any', ok: () => true },
  { v: '100', label: 'Up to GH₵ 100', ok: (p: number) => p <= 10000 },
  { v: '250', label: 'Up to GH₵ 250', ok: (p: number) => p <= 25000 },
  { v: '250+', label: 'GH₵ 250+', ok: (p: number) => p >= 25000 }
];

export function Finder() {
  const { products } = useStore();
  const [mood, setMood] = useState<Mood>('warm');
  const [budget, setBudget] = useState('any');
  const [results, setResults] = useState<Product[] | null>(null);
  const out = useRef<HTMLDivElement>(null);

  function reveal(e: React.FormEvent) {
    e.preventDefault();
    const m = MOODS[mood];
    const b = BUDGETS.find((x) => x.v === budget)!;
    const scored = products.filter((p) => b.ok(minPrice(p))).map((p) => {
      const notes = p.notes.join(' ').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const s = m.words.reduce((acc, w) => acc + (notes.includes(w) ? 3 : desc.includes(w) ? 1 : 0), 0);
      return { p, s };
    }).filter((x) => x.s > 0)
      .sort((a, b2) => b2.s - a.s || Number(b2.p.badge === 'Bestseller') - Number(a.p.badge === 'Bestseller'))
      .slice(0, 4).map((x) => x.p);
    setResults(scored);
    requestAnimationFrame(() => out.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const ask = `Hello Classy Luxe! I love ${MOODS[mood].label} fragrances. Can you recommend one for me?`;
  return (
    <>
      <form className="finder-form reveal d2" onSubmit={reveal}>
        <fieldset>
          <legend>1 · Your mood</legend>
          <div className="finder-options" role="radiogroup">
            {(Object.keys(MOODS) as Mood[]).map((k) => (
              <label key={k} className="mood">
                <input type="radio" name="mood" checked={mood === k} onChange={() => setMood(k)} />
                <span><strong>{MOODS[k].label}</strong><small>{MOODS[k].hint}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>2 · Your budget</legend>
          <div className="finder-budget">
            {BUDGETS.map((b) => (
              <label key={b.v}><input type="radio" name="budget" checked={budget === b.v} onChange={() => setBudget(b.v)} /><span>{b.label}</span></label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn btn-dark">Reveal My Matches</button>
      </form>
      <div className="finder-results col-span-full" ref={out} aria-live="polite">
        {results && (results.length ? (
          <>
            <div className="finder-results-head">
              <h3>Your <em>{MOODS[mood].label}</em> matches</h3>
              <WaLink className="text-link" text={ask}>Ask for advice <i aria-hidden="true">→</i></WaLink>
            </div>
            <div className="product-grid">{results.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
          </>
        ) : (
          <>
            <div className="finder-results-head"><h3>No exact matches <em>in that budget</em></h3></div>
            <p className="finder-empty">Try another budget — or <WaLink text={ask}>ask us on WhatsApp</WaLink> for a personal recommendation.</p>
          </>
        ))}
      </div>
    </>
  );
}
