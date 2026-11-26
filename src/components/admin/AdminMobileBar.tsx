'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AdminRole } from '@/lib/types';
import { AdminNav } from './AdminNav';
import { NotificationBell, type Notice } from './NotificationBell';

/** Top bar + slide-in menu for the admin on phones and tablets (hidden on large screens). */
export function AdminMobileBar({ role, name, notices }: { role: AdminRole; name: string; notices: Notice[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = ''; };
  }, [open]);

  return (
    <div className="lg:hidden">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-ivory/10 bg-ink px-4 text-ivory">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-controls="admin-menu"
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-ivory/10">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
        </button>
        <Link href="/admin" className="font-serif text-lg uppercase tracking-[.2em]">Classy <em className="normal-case tracking-normal text-gold">Luxe</em></Link>
        <div className="-mr-1"><NotificationBell items={notices} dark /></div>
      </header>

      {/* Drawer */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} aria-hidden={!open}>
        <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
        <aside id="admin-menu" className={`absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-ink px-4 py-5 text-ivory shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-6 flex items-center justify-between">
            <span className="font-serif text-lg uppercase tracking-[.2em]">Classy <em className="normal-case tracking-normal text-gold">Luxe</em></span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full text-ivory/70 hover:bg-ivory/10">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="no-scrollbar flex-1 overflow-y-auto"><AdminNav role={role} vertical /></div>
          <div className="mt-4 border-t border-ivory/10 pt-4 text-xs text-ivory/50">
            <Link href="/" target="_blank" className="mb-3 block text-ivory/70 hover:text-gold">View store ↗</Link>
            <p className="truncate text-ivory/80">{name}</p>
            <p className="capitalize">{role}</p>
            <form action="/admin/signout" method="post"><button className="mt-2 text-gold hover:underline">Sign out</button></form>
          </div>
        </aside>
      </div>
    </div>
  );
}
