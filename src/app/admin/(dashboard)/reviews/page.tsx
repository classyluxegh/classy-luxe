import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { Badge, Flash, PageHead, btnDanger, btnDark, btnOutline } from '@/components/admin/ui';
import { ConfirmButton, SubmitButton } from '@/components/admin/ConfirmButton';
import { moderateReview } from '../actions';

type Props = { searchParams: Promise<{ status?: string; ok?: string; error?: string }> };
const TABS = [['pending', 'Awaiting approval'], ['approved', 'Approved'], ['rejected', 'Rejected']] as const;

export default async function ReviewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = TABS.some(([v]) => v === sp.status) ? sp.status! : 'pending';
  const { supabase } = await requireAdmin('manager');
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, customer_name, rating, body, status, created_at, product:products(name, slug), order:orders(id, order_number)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);
  const here = `/admin/reviews?status=${status}`;

  return (
    <>
      <PageHead title="Reviews" sub="Only customers with a delivered order can submit a review. Nothing appears on the site until you approve it." />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-6 flex gap-2 text-sm">
        {TABS.map(([v, l]) => <Link key={v} href={`/admin/reviews?status=${v}`} className={`border px-3 py-1.5 ${status === v ? 'border-ink bg-ink text-ivory' : 'border-line'}`}>{l}</Link>)}
      </div>
      <ul className="space-y-4">
        {(reviews || []).map((r) => {
          const product = r.product as unknown as { name: string; slug: string } | null;
          const order = r.order as unknown as { id: string; order_number: string } | null;
          return (
            <li key={r.id} className="border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><strong className="font-medium">{product?.name}</strong> · <span className="text-gold-deep">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></span>
                <span className="text-xs text-muted">{r.customer_name} · {order && <Link className="hover:text-ink" href={`/admin/orders/${order.id}`}>{order.order_number}</Link>} · {new Date(r.created_at).toLocaleDateString('en-GB')}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-text">{r.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(['approved', 'rejected', 'pending'] as const).filter((d) => d !== r.status).map((d) => (
                  <form key={d} action={moderateReview}>
                    <input type="hidden" name="reviewId" value={r.id} /><input type="hidden" name="decision" value={d} /><input type="hidden" name="back" value={here} />
                    <SubmitButton className={d === 'approved' ? btnDark : btnOutline}>{d === 'approved' ? 'Approve' : d === 'rejected' ? 'Reject' : 'Move to pending'}</SubmitButton>
                  </form>
                ))}
                <form action={moderateReview} className="ml-auto">
                  <input type="hidden" name="reviewId" value={r.id} /><input type="hidden" name="decision" value="delete" /><input type="hidden" name="back" value={here} />
                  <ConfirmButton className={btnDanger} message="Delete this review permanently?">Delete</ConfirmButton>
                </form>
              </div>
              {r.status === 'approved' && <p className="mt-2"><Badge tone="good">Live on the product page</Badge></p>}
            </li>
          );
        })}
      </ul>
      {!reviews?.length && <p className="text-sm text-muted">No reviews here.</p>}
    </>
  );
}
