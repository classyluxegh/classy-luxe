import { NextResponse, type NextRequest } from 'next/server';
import { applyVerification, isValidSignature, verifyTransaction } from '@/lib/paystack';
import { createServiceClient } from '@/lib/supabase/service';
import { log } from '@/lib/log';

/** Paystack webhook. Set in Paystack Dashboard → Settings → API Keys & Webhooks: https://YOUR-DOMAIN/api/paystack/webhook */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!isValidSignature(raw, request.headers.get('x-paystack-signature'))) {
    log.warn('paystack.webhook_bad_signature');
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'bad payload' }, { status: 400 }); }

  const reference = event.data?.reference;
  if ((event.event === 'charge.success' || event.event === 'charge.failed') && reference && /^[A-Za-z0-9-]{4,80}$/.test(reference)) {
    try {
      // Re-verify with Paystack rather than trusting the payload.
      const tx = await verifyTransaction(reference);
      const outcome = await applyVerification(createServiceClient(), tx);
      log.info('paystack.webhook', { event: event.event, reference, outcome });
    } catch (e) {
      log.error('paystack.webhook_failed', e);
      return NextResponse.json({ error: 'retry' }, { status: 500 }); // Paystack retries
    }
  }
  return NextResponse.json({ received: true });
}
