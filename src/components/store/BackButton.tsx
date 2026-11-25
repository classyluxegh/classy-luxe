'use client';

import { useRouter } from 'next/navigation';

/**
 * "← Back": returns to the previous page on this site (keeping the shop's
 * filters and scroll position). If the visitor arrived directly — from a
 * shared link or Google — it takes them to the shop instead.
 */
export function BackButton({ fallback = '/shop', className = '' }: { fallback?: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`group inline-flex items-center gap-2.5 text-[.7rem] uppercase tracking-[.22em] text-muted transition-colors hover:text-ink ${className}`}
      onClick={() => {
        let sameSite = false;
        try { sameSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch { /* ignore */ }
        if (sameSite && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full border border-line text-base transition-all duration-300 group-hover:-translate-x-0.5 group-hover:border-ink group-hover:bg-ink group-hover:text-ivory">←</span>
      Back
    </button>
  );
}
