'use client';

import { usePathname } from 'next/navigation';
import type { AdminRole } from '@/lib/types';
import { NavLink } from './ui';

const LINKS: { href: string; label: string; min: AdminRole }[] = [
  { href: '/admin', label: 'Dashboard', min: 'staff' },
  { href: '/admin/orders', label: 'Orders', min: 'staff' },
  { href: '/admin/customers', label: 'Customers', min: 'staff' },
  { href: '/admin/inventory', label: 'Inventory', min: 'staff' },
  { href: '/admin/products', label: 'Products', min: 'manager' },
  { href: '/admin/categories', label: 'Categories', min: 'manager' },
  { href: '/admin/reviews', label: 'Reviews', min: 'manager' },
  { href: '/admin/delivery', label: 'Delivery fees', min: 'manager' },
  { href: '/admin/settings', label: 'Settings', min: 'manager' },
  { href: '/admin/team', label: 'Team', min: 'owner' }
];
const RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

export function AdminNav({ role }: { role: AdminRole }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-1" aria-label="Admin">
      {LINKS.filter((l) => RANK[role] >= RANK[l.min]).map((l) => (
        <NavLink key={l.href} href={l.href} active={l.href === '/admin' ? path === '/admin' : path.startsWith(l.href)}>{l.label}</NavLink>
      ))}
    </nav>
  );
}
