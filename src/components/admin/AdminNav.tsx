'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminRole } from '@/lib/types';

type Item = { href: string; label: string; min: AdminRole; icon: React.ReactNode };

/* Simple line icons (24×24, drawn with the current text colour) */
const I = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  orders: <><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>,
  customers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>,
  inventory: <><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
  products: <><path d="M9 3h6v3H9z" /><path d="M8 6h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /><path d="M10 12h4" /></>,
  categories: <><path d="M3 5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z" /></>,
  reviews: <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8L12 4Z" />,
  delivery: <><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  team: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>
};

const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [
    { href: '/admin', label: 'Dashboard', min: 'staff', icon: I.dashboard },
    { href: '/admin/orders', label: 'Orders', min: 'staff', icon: I.orders },
    { href: '/admin/customers', label: 'Customers', min: 'staff', icon: I.customers }
  ] },
  { title: 'Catalogue', items: [
    { href: '/admin/inventory', label: 'Inventory', min: 'staff', icon: I.inventory },
    { href: '/admin/products', label: 'Products', min: 'manager', icon: I.products },
    { href: '/admin/categories', label: 'Categories', min: 'manager', icon: I.categories },
    { href: '/admin/reviews', label: 'Reviews', min: 'manager', icon: I.reviews }
  ] },
  { title: 'Store', items: [
    { href: '/admin/delivery', label: 'Delivery fees', min: 'manager', icon: I.delivery },
    { href: '/admin/settings', label: 'Settings', min: 'manager', icon: I.settings },
    { href: '/admin/team', label: 'Team', min: 'owner', icon: I.team }
  ] }
];
const RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

export function AdminNav({ role, vertical }: { role: AdminRole; vertical?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label={vertical ? 'Admin menu' : 'Admin'}
      className={vertical ? 'space-y-7' : 'flex flex-1 flex-col justify-between gap-7'}>
      {GROUPS.map((g) => {
        const items = g.items.filter((l) => RANK[role] >= RANK[l.min]);
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="mb-2 px-3 text-[.6rem] uppercase tracking-[.26em] text-ivory/35">{g.title}</p>
            <ul className="space-y-1">
              {items.map((l) => {
                const active = l.href === '/admin' ? path === '/admin' : path.startsWith(l.href);
                return (
                  <li key={l.href}>
                    <Link href={l.href} aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'bg-ivory/[.08] text-gold-light' : 'text-ivory/65 hover:bg-ivory/[.04] hover:text-ivory'}`}>
                      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gold" />}
                      <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-gold' : 'text-ivory/45 group-hover:text-ivory/80'}`}
                        fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{l.icon}</svg>
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
