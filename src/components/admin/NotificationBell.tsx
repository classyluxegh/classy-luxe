'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type Notice = {
  id: string;
  kind: 'order' | 'payment' | 'stock' | 'review';
  title: string;
  sub: string;
  href: string;
  at?: string;
};

const ICON: Record<Notice['kind'], { bg: string; path: React.ReactNode }> = {
  order: { bg: 'bg-gold/15 text-gold-deep', path: <><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></> },
  payment: { bg: 'bg-[#1F7A4D]/10 text-[#1F7A4D]', path: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" /></> },
  stock: { bg: 'bg-danger/10 text-danger', path: <><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="M3 8v8l9 5 9-5V8" /></> },
  review: { bg: 'bg-beige text-ink', path: <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8L12 4Z" /> }
};

const ago = (iso?: string) => {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
};

/** Bell with a count of things that need attention, and a dropdown listing them. */
export function NotificationBell({ items, dark }: { items: Notice[]; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open}
        aria-label={count ? `Notifications, ${count} need${count === 1 ? 's' : ''} attention` : 'Notifications'}
        className={dark
          ? 'relative flex h-10 w-10 items-center justify-center rounded-full text-ivory/80 hover:bg-ivory/10 hover:text-gold'
          : 'relative flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-gold-deep'}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2.2 2.2 0 0 0 4 0" />
        </svg>
        {count > 0 && (
          <span className={`absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#D93636] px-1 text-[.6rem] font-medium leading-none text-white ring-2 ${dark ? 'ring-ink' : 'ring-ivory-2'}`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-white text-ink shadow-[0_18px_40px_rgba(15,13,11,.14)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-serif text-lg">Notifications</p>
            {count > 0 && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[.62rem] uppercase tracking-[.14em] text-gold-deep">{count} to do</span>}
          </div>
          {count ? (
            <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-ivory">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ICON[n.kind].bg}`}>
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICON[n.kind].path}</svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink">{n.title}</span>
                      <span className="block truncate text-xs text-muted">{n.sub}</span>
                    </span>
                    {n.at && <span className="shrink-0 text-[.66rem] text-muted">{ago(n.at)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="font-serif text-lg">You’re all caught up</p>
              <p className="mt-1 text-xs text-muted">New orders, unpaid orders and low stock will show here.</p>
            </div>
          )}
          <Link href="/admin/orders" onClick={() => setOpen(false)} className="block border-t border-line bg-ivory/60 px-4 py-2.5 text-center text-xs text-muted hover:text-ink">View all orders →</Link>
        </div>
      )}
    </div>
  );
}
