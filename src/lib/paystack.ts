import 'server-only';
import crypto from 'node:crypto';
import { serverEnv } from '@/lib/env';

const API = 'https://api.paystack.co';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${serverEnv.paystackSecret()}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store'
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !body.status || !body.data) throw new Error(`Paystack: ${body.message || res.statusText}`);
  return body.data;
}

export function initializeTransaction(args: { email: string; amountPesewas: number; reference: string; callbackUrl: string; metadata: Record<string, unknown> }) {
  return call<{ authorization_url: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: args.email,
      amount: args.amountPesewas, // GHS subunit (pesewas)
      currency: 'GHS',
      reference: args.reference,
      callback_url: args.callbackUrl,
      channels: ['mobile_money', 'card', 'bank_transfer'],
      metadata: args.metadata
    })
  });
}

export interface VerifiedTransaction {
  id: number;
  status: 'success' | 'failed' | 'abandoned' | 'ongoing' | 'pending' | 'reversed' | string;
  amount: number;
  currency: string;
  reference: string;
  channel: string | null;
  gateway_response: string | null;
  paid_at: string | null;
}

export function verifyTransaction(reference: string) {
  return call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Records a verified Paystack transaction against its order (idempotent). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function applyVerification(supabase: any, tx: VerifiedTransaction): Promise<'paid' | 'failed' | 'pending' | 'review'> {
  const verification = { id: tx.id, status: tx.status, amount: tx.amount, currency: tx.currency, channel: tx.channel, gateway_response: tx.gateway_response, paid_at: tx.paid_at };
  if (tx.status === 'success' && tx.currency === 'GHS') {
    const { data, error } = await supabase.rpc('mark_order_paid', { p_reference: tx.reference, p_amount: tx.amount, p_channel: tx.channel, p_verification: verification });
    if (error) throw error;
    return data === 'PAID' || data === 'ALREADY_PAID' ? 'paid' : 'review';
  }
  if (tx.status === 'failed' || tx.status === 'abandoned') {
    const { error } = await supabase.rpc('mark_payment_failed', { p_reference: tx.reference, p_status: tx.status, p_verification: verification });
    if (error) throw error;
    return 'failed';
  }
  return 'pending';
}

export function isValidSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !serverEnv.paystackEnabled()) return false;
  const expected = crypto.createHmac('sha512', serverEnv.paystackSecret()).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
