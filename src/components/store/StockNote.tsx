'use client';

import type { Variant } from '@/lib/types';
import { useSettings } from './StoreProvider';

/** "In stock" / "Only 2 left" / "Out of stock" — based on real inventory. */
export function stockText(v: Pick<Variant, 'inStock' | 'stock'>, lowThreshold: number): { text: string; tone: 'ok' | 'low' | 'out' } {
  if (!v.inStock) return { text: 'Out of stock', tone: 'out' };
  if (v.stock !== null && v.stock <= lowThreshold) return { text: `Only ${v.stock} left`, tone: 'low' };
  return { text: 'In stock', tone: 'ok' };
}

export function StockNote({ variant, className = '' }: { variant: Pick<Variant, 'inStock' | 'stock'>; className?: string }) {
  const { lowStockThreshold } = useSettings();
  const s = stockText(variant, lowStockThreshold);
  const color = s.tone === 'out' ? 'text-danger' : s.tone === 'low' ? 'text-gold-deep' : 'text-whatsapp';
  return (
    <span className={`inline-flex items-center gap-2 text-[.72rem] tracking-[.04em] ${color} ${className}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.text}
    </span>
  );
}
