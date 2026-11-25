import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminMobileBar } from '@/components/admin/AdminMobileBar';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, name } = await requireAdmin();
  return (
    <div className="min-h-screen bg-ivory-2 lg:grid lg:grid-cols-[240px_1fr]">
      <AdminMobileBar role={role} name={name} />
      <aside className="relative hidden bg-ink px-4 py-8 text-ivory lg:sticky lg:top-0 lg:block lg:h-screen">
        <div className="mb-10">
          <Link href="/admin" className="font-serif text-xl tracking-[.22em] uppercase">Classy <em className="normal-case tracking-normal text-gold">Luxe</em></Link>
          <Link href="/" className="mt-1 block text-xs text-ivory/50 hover:text-gold" target="_blank">View store ↗</Link>
        </div>
        <AdminNav role={role} />
        <div className="absolute bottom-6 left-4 right-4 border-t border-ivory/10 pt-4 text-xs text-ivory/50">
          <p className="truncate">{name}</p>
          <p className="capitalize">{role}</p>
          <form action="/admin/signout" method="post"><button className="mt-2 text-gold hover:underline">Sign out</button></form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
