import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { money } from '@/lib/money';
import type { AdminRole } from '@/lib/types';
import type { Notice } from '@/components/admin/NotificationBell';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Things that need the team's attention, read live from the database:
 * new orders to confirm, unpaid orders, low/sold-out stock and reviews to approve.
 * Any query that fails (e.g. a role that can't read reviews) is simply skipped.
 */
export async function getNotices(supabase: Supabase, role: AdminRole): Promise<Notice[]> {
  const manager = role !== 'staff';
  const [pending, unpaid, settings, variants, reviews] = await Promise.all([
    supabase.from('orders').select('id, order_number, customer_name, total_pesewas, created_at')
      .eq('status', 'pending').order('created_at', { ascending: false }).limit(6),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .in('payment_status', ['unpaid', 'pending', 'failed']).neq('status', 'cancelled'),
    supabase.from('store_settings').select('low_stock_threshold').maybeSingle(),
    supabase.from('product_variants').select('stock').eq('track_inventory', true).eq('is_active', true),
    manager ? supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 })
  ]);

  const notices: Notice[] = [];

  for (const o of pending.data || []) {
    notices.push({
      id: `order-${o.id}`, kind: 'order',
      title: `New order ${o.order_number}`,
      sub: `${o.customer_name} · ${money(o.total_pesewas)} · waiting to be confirmed`,
      href: `/admin/orders/${o.id}`, at: o.created_at
    });
  }

  const owing = unpaid.count || 0;
  if (owing > 0) notices.push({
    id: 'payments', kind: 'payment',
    title: `${owing} order${owing === 1 ? '' : 's'} awaiting payment`,
    sub: 'Mark them as paid once the money arrives', href: '/admin/orders?payment=unpaid'
  });

  const low = settings.data?.low_stock_threshold ?? 3;
  const stock = (variants.data || []) as { stock: number }[];
  const out = stock.filter((v) => v.stock === 0).length;
  const lowCount = stock.filter((v) => v.stock > 0 && v.stock <= low).length;
  if (out > 0) notices.push({
    id: 'sold-out', kind: 'stock',
    title: `${out} size${out === 1 ? '' : 's'} out of stock`,
    sub: 'Restock, or mark back in stock', href: '/admin/inventory?filter=out'
  });
  if (lowCount > 0) notices.push({
    id: 'low-stock', kind: 'stock',
    title: `${lowCount} size${lowCount === 1 ? '' : 's'} running low`,
    sub: `At or below ${low} units`, href: '/admin/inventory?filter=low'
  });

  const toApprove = ('count' in reviews ? reviews.count : 0) || 0;
  if (toApprove > 0) notices.push({
    id: 'reviews', kind: 'review',
    title: `${toApprove} review${toApprove === 1 ? '' : 's'} to approve`,
    sub: 'Nothing shows on the site until you approve it', href: '/admin/reviews'
  });

  return notices;
}

export type TodayStats = { orders: number; value: number; paid: number };

/** Orders placed today (Accra time = UTC) — count, total value and value already paid. Cancelled orders excluded. */
export async function getToday(supabase: Supabase): Promise<TodayStats> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase.from('orders').select('total_pesewas, payment_status')
    .gte('created_at', start.toISOString()).neq('status', 'cancelled');
  const rows = (data || []) as { total_pesewas: number; payment_status: string }[];
  return {
    orders: rows.length,
    value: rows.reduce((n, r) => n + r.total_pesewas, 0),
    paid: rows.filter((r) => r.payment_status === 'paid').reduce((n, r) => n + r.total_pesewas, 0)
  };
}
