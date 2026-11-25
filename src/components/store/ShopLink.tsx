'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { markGlide } from './LogoLink';

export interface ShopFilter { collection?: 'all' | 'student' | 'general'; category?: string }
export const SHOP_EVENT = 'classyluxe:shop-filter';

/** Scrolls to the product filters on the /shop page. */
export function scrollToShop() {
  const el = document.getElementById('shop');
  if (!el) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 60, behavior: reduced ? 'auto' : 'smooth' });
}

/** Link to the /shop page, optionally with a preset collection or category filter. */
export function ShopLink({ collection, category, className, children, onClick, glide, ...rest }: ShopFilter & { className?: string; children: React.ReactNode; /** navbar: glide to the top of /shop */ glide?: boolean } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const pathname = usePathname();
  const params = new URLSearchParams();
  if (collection && collection !== 'all') params.set('collection', collection);
  if (category) params.set('category', category);
  const href = `/shop${params.toString() ? `?${params.toString()}` : ''}`;
  return (
    <Link
      href={href}
      scroll={glide ? false : undefined}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (pathname !== '/shop') { if (glide) markGlide(); return; } // navigation to /shop
        // Already on the shop page: update the filters in place
        e.preventDefault();
        window.dispatchEvent(new CustomEvent<ShopFilter>(SHOP_EVENT, { detail: { collection: collection || 'all', category: category || 'all' } }));
        history.replaceState(null, '', href);
        scrollToShop();
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
