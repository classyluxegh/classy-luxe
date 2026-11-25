import { NextResponse, type NextRequest } from 'next/server';
import { applyVerification, verifyTransaction } from '@/lib/paystack';
import { createServiceClient } from '@/lib/supabase/service';
import { publicEnv } from '@/lib/env';
import { log } from '@/lib/log';

/** Paystack redirects the customer here after payment. We verify server-side, never trusting the query string. */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference') || request.nextUrl.searchParams.get('trxref');
  const result = new URL('/checkout/result', publicEnv.siteUrl);
  if (!reference || !/^[A-Za-z0-9-]{4,80}$/.test(reference)) {
    result.searchParams.set('status', 'invalid');
    return NextResponse.redirect(result);
  }
  result.searchParams.set('ref', reference);
  try {
    const tx = await verifyTransaction(reference);
    const outcome = await applyVerification(createServiceClient(), tx);
    log.info('paystack.callback', { reference, outcome });
    result.searchParams.set('status', outcome);
  } catch (e) {
    log.error('paystack.callback_failed', e);
    result.searchParams.set('status', 'review');
  }
  return NextResponse.redirect(result);
}
