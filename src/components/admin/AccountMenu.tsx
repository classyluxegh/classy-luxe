'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { AdminRole } from '@/lib/types';

const ROLE_LABEL: Record<AdminRole, string> = { owner: 'Owner', manager: 'Manager', staff: 'Staff' };

/** Signed-in person with a small dropdown (View store, Team, Sign out). Shown top-right of the admin. */
export function AccountMenu({ name, role }: { name: string; role: AdminRole }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

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
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-serif text-[.95rem] text-ink">{initials}</span>
        <span className="hidden leading-tight sm:block">
          <span className="block max-w-[10rem] truncate text-sm text-ink">{name}</span>
          <span className="block text-[.68rem] text-muted">{ROLE_LABEL[role]}</span>
        </span>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
          className={`flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white hover:text-gold-deep ${open ? 'bg-white text-gold-deep' : ''}`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_24px_50px_rgba(15,13,11,.14)]">
          {/* Who's signed in */}
          <div className="flex items-center gap-3 rounded-xl bg-ivory/80 p-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold font-serif text-base text-ink">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{name}</p>
              <span className="mt-0.5 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[.58rem] uppercase tracking-[.16em] text-gold-deep">{ROLE_LABEL[role]}</span>
            </div>
          </div>

          <div className="mt-1.5 space-y-0.5">
            <MenuLink href="/" external onClick={() => setOpen(false)} icon={<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>}>View store</MenuLink>
            {role !== 'staff' && (
              <MenuLink href="/admin/settings" onClick={() => setOpen(false)} icon={<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>}>Settings</MenuLink>
            )}
            {role === 'owner' && (
              <MenuLink href="/admin/team" onClick={() => setOpen(false)} icon={<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>}>Team</MenuLink>
            )}
          </div>

          <form action="/admin/signout" method="post" className="mt-1.5 border-t border-line pt-1.5">
            <button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger/5">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></svg>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, external, onClick, children }: { href: string; icon: React.ReactNode; external?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link role="menuitem" href={href} target={external ? '_blank' : undefined} onClick={onClick}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink transition-colors hover:bg-ivory">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-muted transition-colors group-hover:text-gold-deep" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      <span className="flex-1">{children}</span>
      {external && <span aria-hidden="true" className="text-[.7rem] text-muted">New tab</span>}
    </Link>
  );
}
