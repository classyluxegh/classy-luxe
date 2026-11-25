'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { animate } from 'framer-motion';

/**
 * Gently scrolls back to the top of the page. Duration grows with distance
 * (≈0.8s short hops → 1.6s from far down) and stops if the visitor scrolls.
 */
export function scrollToTopGently() {
  const start = window.scrollY;
  if (start <= 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  const duration = Math.min(1.6, Math.max(0.8, start / 4000 + 0.6));
  const controls = animate(start, 0, {
    duration,
    ease: [0.65, 0, 0.35, 1], // ease in-out: soft start, soft landing
    onUpdate: (y) => window.scrollTo({ top: y, behavior: 'instant' })
  });
  const cancel = () => { controls.stop(); cleanup(); };
  const cleanup = () => {
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
    window.removeEventListener('keydown', cancel);
  };
  window.addEventListener('wheel', cancel, { passive: true, once: true });
  window.addEventListener('touchstart', cancel, { passive: true, once: true });
  window.addEventListener('keydown', cancel, { once: true });
  controls.then(cleanup);
}

/* ── Navbar page changes: open the new page where you were, then glide to its top ── */
let glidePending = false;
/** Call before a navbar navigation so the next page glides up to its top. */
export function markGlide() { glidePending = true; }

/** Mounted once (in the Header): runs the glide after a navbar navigation lands. */
export function GlideOnNavigate() {
  const pathname = usePathname();
  useEffect(() => {
    if (!glidePending) return;
    glidePending = false;
    // wait two frames so the new page is painted before gliding
    requestAnimationFrame(() => requestAnimationFrame(scrollToTopGently));
  }, [pathname]);
  return null;
}

/** Navbar link: glides to the top of the destination page instead of jumping there. */
export function GlideLink({ href, className, children, onClick, ...rest }: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      scroll={false}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (href === pathname) { e.preventDefault(); scrollToTopGently(); return; } // already here: glide up
        markGlide();
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** The Classy Luxe logo: on the homepage it glides back to the top, elsewhere it goes home and glides up. */
export function LogoLink({ className, children, onClick, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Link
      href="/"
      scroll={false}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (pathname !== '/') { markGlide(); return; }
        e.preventDefault();
        if (window.location.hash) history.replaceState(null, '', '/');
        scrollToTopGently();
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
