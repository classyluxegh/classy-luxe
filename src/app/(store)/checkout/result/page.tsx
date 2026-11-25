import type { Metadata } from 'next';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/service';
import { money } from '@/lib/money';
import { WaLink } from '@/components/store/WaLink';
import { ClearCartOnPaid } from '@/components/store/ClearCartOnPaid';

export const metadata: Metadata = { title: 'Order status', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ ref?: string; status?: string }> };

export default async function CheckoutResult({ searchParams }: Props) {
  const { ref, status } = await searchParams;
  let order: { order_number: string; payment_status: string; total_pesewas: number } | null = null;
  if (ref && /^[A-Za-z0-9-]{4,80}$/.test(ref)) {
    // Lookup by the unguessable Paystack reference only; shows minimal details.
    const { data } = await createServiceClient().from('orders').select('order_number, payment_status, total_pesewas').eq('paystack_reference', ref).maybeSingle();
    order = data;
  }
  const paid = order?.payment_status === 'paid';

  return (
    <section className="section" style={{ paddingTop: 160 }}>
      <div className="container" style={{ maxWidth: 720, textAlign: 'center' }}>
        <p className="eyebrow">{paid ? 'Payment received' : 'Order status'}</p>
        <h1 className="h2">
          {paid ? <>Thank you — order <em>{order!.order_number}</em> is confirmed.</>
            : status === 'failed' || order?.payment_status === 'failed' ? <>Your payment <em>didn&apos;t go through.</em></>
            : <>We&apos;re checking <em>your payment.</em></>}
        </h1>
        <p className="lead" style={{ margin: '24px auto 40px' }}>
          {paid ? `We received ${money(order!.total_pesewas)}. We'll message you on WhatsApp with delivery updates.`
            : status === 'failed' ? `No money was taken for ${order ? `order ${order.order_number}` : 'this order'}. You can try again or complete your order on WhatsApp.`
            : `If you were charged, your order${order ? ` ${order.order_number}` : ''} will be confirmed shortly. Message us on WhatsApp if you have any questions.`}
        </p>
        {paid && <ClearCartOnPaid />}
        <div className="hero-ctas" style={{ justifyContent: 'center' }}>
          <Link href="/shop" className="btn btn-dark">Continue Shopping</Link>
          <WaLink className="btn btn-outline" text={`Hello Classy Luxe! I have a question about ${order ? `order ${order.order_number}` : 'my online payment'}.`}>Message Us</WaLink>
        </div>
      </div>
    </section>
  );
}
