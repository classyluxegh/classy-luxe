import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminMobileBar } from '@/components/admin/AdminMobileBar';
import { AccountMenu } from '@/components/admin/AccountMenu';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { TopBar } from '@/components/admin/TopBar';
import { getNotices, getToday } from '@/lib/admin-notices';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, role, name } = await requireAdmin();
  const [notices, today] = await Promise.all([getNotices(supabase, role), getToday(supabase)]);
  return (
    <div className="min-h-screen bg-ivory-2 lg:grid lg:grid-cols-[240px_1fr]">
      <AdminMobileBar role={role} name={name} notices={notices} />
      <aside className="hidden bg-ink text-ivory lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-6 pb-8 pt-8">
          <Link href="/admin" className="font-serif text-xl uppercase tracking-[.22em]">Classy <em className="normal-case tracking-normal text-gold">Luxe</em></Link>
          <p className="mt-1 text-[.6rem] uppercase tracking-[.3em] text-ivory/35">Admin</p>
        </div>
        {/* Groups spread evenly down the full height of the sidebar */}
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-10">
          <div className="flex flex-1 flex-col"><AdminNav role={role} /></div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8">
        <header className="sticky top-0 z-30 -mx-10 -mt-8 mb-8 hidden items-center gap-4 border-b border-line bg-ivory-2/90 px-10 py-3.5 backdrop-blur lg:flex">
          <TopBar today={today} />
          <NotificationBell items={notices} />
          <span aria-hidden="true" className="h-7 w-px bg-line" />
          <AccountMenu name={name} role={role} />
        </header>
        {children}
      </main>
    </div>
  );
}
