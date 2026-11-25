'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const SELECTOR = '.reveal:not(.in), .reveal-img:not(.in)';

/**
 * Adds `.in` to `.reveal` / `.reveal-img` elements as they scroll into view.
 *
 * One IntersectionObserver lives for the whole page. New elements (filters,
 * finder results, page changes) are picked up by a MutationObserver that only
 * *adds* them — it never restarts the observer, so busy pages (counters,
 * sliders) can't stop elements from revealing. A safety net also reveals
 * anything already on screen after a short delay.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const reveal = (el: Element) => el.classList.add('in');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      const all = () => document.querySelectorAll(SELECTOR).forEach(reveal);
      all();
      const mo = new MutationObserver(all);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); } }),
      { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }
    );
    const observeNew = () => document.querySelectorAll(SELECTOR).forEach((el) => io.observe(el)); // observing twice is a no-op
    observeNew();

    let frame = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(observeNew);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety net: anything already in the viewport shows within a second regardless.
    const safety = window.setTimeout(() => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
      });
    }, 1200);

    return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(frame); window.clearTimeout(safety); };
  }, [pathname]);

  return null;
}
