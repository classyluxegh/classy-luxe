import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, name } = await requireAdmin();
  return (
    <div className="min-h-screen bg-ivory-2 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-ink px-4 py-5 text-ivory lg:sticky lg:top-0 lg:h-screen lg:py-8">
        <div className="mb-4 flex items-center justify-between lg:mb-10 lg:block">
          <Link href="/admin" className="font-serif text-xl tracking-[.22em] uppercase">Classy <em className="normal-case tracking-normal text-gold">Luxe</em></Link>
          <Link href="/" className="text-xs text-ivory/50 hover:text-gold lg:mt-1 lg:block" target="_blank">View store ↗</Link>
        </div>
        <AdminNav role={role} />
        <div className="mt-6 border-t border-ivory/10 pt-4 text-xs text-ivory/50 lg:absolute lg:bottom-6 lg:left-4 lg:right-4">
          <p className="truncate">{name}</p>
          <p className="capitalize">{role}</p>
          <form action="/admin/signout" method="post"><button className="mt-2 text-gold hover:underline">Sign out</button></form>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
