'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { money } from '@/lib/money';

const NAMES: Record<string, string> = {
  orders: 'Orders', customers: 'Customers', inventory: 'Inventory', products: 'Products', categories: 'Categories',
  reviews: 'Reviews', delivery: 'Delivery fees', settings: 'Settings', team: 'Team', new: 'New'
};

type Today = { orders: number; value: number; paid: number };

/** Left side of the admin top bar: breadcrumbs, and today's live figures. */
export function TopBar({ today }: { today: Today }) {
  const path = usePathname();
  const parts = path.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  const section = parts[0] ? NAMES[parts[0]] ?? parts[0] : 'Dashboard';
  const detail = parts[1] ? (NAMES[parts[1]] ?? 'Details') : null;

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1 text-sm">
          <li>
            <Link href="/admin" className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-white hover:text-ink">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /></svg>
              Admin
            </Link>
          </li>
          <Chevron />
          {detail ? (
            <>
              <li><Link href={`/admin/${parts[0]}`} className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-white hover:text-ink">{section}</Link></li>
              <Chevron />
              <li aria-current="page" className="truncate rounded-full bg-white px-3 py-1.5 text-ink shadow-[0_1px_0_rgba(15,13,11,.04)] ring-1 ring-line">{detail}</li>
            </>
          ) : <li aria-current="page" className="truncate rounded-full bg-white px-3 py-1.5 text-ink shadow-[0_1px_0_rgba(15,13,11,.04)] ring-1 ring-line">{section}</li>}
        </ol>
      </nav>

      {/* Today at a glance (live from the database) */}
      <Link href="/admin/orders" aria-label={`Today: ${today.orders} orders, ${money(today.value)} ordered, ${money(today.paid)} paid`}
        className="group hidden items-center gap-5 xl:flex">
        <p className="text-[.62rem] uppercase tracking-[.24em] text-gold-deep">Today</p>
        <Figure icon={<><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>} value={String(today.orders)} label={today.orders === 1 ? 'Order' : 'Orders'} />
        <Figure icon={<><path d="M4 7h16v10H4z" /><circle cx="12" cy="12" r="2.5" /></>} value={money(today.value)} label="Ordered" />
        <Figure icon={<path d="m5 12 4.5 4.5L19 7" />} value={money(today.paid)} label="Paid" good />
      </Link>
    </div>
  );
}

function Chevron() {
  return (
    <li aria-hidden="true" className="text-muted/50">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
    </li>
  );
}

function Figure({ icon, value, label, good }: { icon: React.ReactNode; value: string; label: string; good?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${good ? 'bg-[#1F7A4D]/10 text-[#1F7A4D]' : 'bg-gold/15 text-gold-deep'}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </span>
      <span className="leading-tight">
        <span className="block font-serif text-base text-ink transition-colors group-hover:text-gold-deep">{value}</span>
        <span className="block text-[.66rem] text-muted">{label}</span>
      </span>
    </span>
  );
}
