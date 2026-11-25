'use server';

import { checkoutSchema, type CheckoutInput } from '@/lib/validation';
import { createServiceClient } from '@/lib/supabase/service';
import { serverEnv, publicEnv } from '@/lib/env';
import { initializeTransaction } from '@/lib/paystack';
import { money } from '@/lib/money';
import { waLink, COLLECTIONS, DEFAULT_SETTINGS } from '@/lib/site';
import { log, maskPhone } from '@/lib/log';

export type CheckoutResult =
  | { ok: true; orderNumber: string; whatsappUrl: string; paystackUrl?: string; totalPesewas: number; feeKnown: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const DB_ERRORS: Record<string, string> = {
  INVALID_ITEMS: 'Your bag is empty or too large.',
  INVALID_QUANTITY: 'One of the quantities is not valid.',
  PRODUCT_UNAVAILABLE: 'A product in your bag is no longer available. Please refresh and try again.',
  DELIVERY_FEE_UNKNOWN: 'Online payment is not available for this delivery area yet — please checkout via WhatsApp so we can confirm the delivery fee.'
};

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: 'Please check the highlighted details.', fieldErrors };
  }
  const v = parsed.data;
  if (v.website) return { ok: false, error: 'Unable to place order.' }; // bot
  if (v.payment === 'paystack' && !serverEnv.paystackEnabled()) {
    return { ok: false, error: 'Online payment is not available yet. Please checkout via WhatsApp.' };
  }

  const region = v.delivery === 'region' ? v.region : 'Greater Accra';
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('place_order', {
    p_name: v.name,
    p_phone: v.phone,
    p_delivery: v.delivery,
    p_region: region,
    p_location: v.location,
    p_notes: v.notes,
    p_payment: v.payment,
    p_items: v.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity }))
  });

  if (error || !data?.[0]) {
    const code = error?.message || '';
    if (code.startsWith('OUT_OF_STOCK:')) {
      return { ok: false, error: `Sorry — ${code.split(':')[1]} doesn't have enough stock for that quantity. Please reduce it or ask us on WhatsApp.` };
    }
    log.error('checkout.place_order_failed', { code, phone: maskPhone(v.phone) });
    return { ok: false, error: DB_ERRORS[code] || 'We could not place your order. Please try again or message us on WhatsApp.' };
  }

  log.info('checkout.order_created', { order: (data[0] as { order_number: string }).order_number, payment: v.payment, delivery: v.delivery });
  const order = data[0] as { order_id: string; order_number: string; subtotal_pesewas: number; delivery_fee_pesewas: number | null; total_pesewas: number };

  // Items exactly as stored (DB prices), for the WhatsApp message.
  const { data: items } = await supabase
    .from('order_items')
    .select('product_name, variant_label, collection, unit_price_pesewas, quantity, line_total_pesewas')
    .eq('order_id', order.order_id);

  const lines = [`Hello Classy Luxe! I've placed order *${order.order_number}* on your website.`, '', '*ORDER*'];
  (items || []).forEach((it, i) => {
    const col = it.collection ? ` — ${COLLECTIONS[it.collection as 'student' | 'general'].name}` : '';
    lines.push(`${i + 1}. ${it.product_name}${it.variant_label ? ` (${it.variant_label})` : ''}${col}`);
    lines.push(`   ${it.quantity} × ${money(it.unit_price_pesewas)} = ${money(it.line_total_pesewas)}`);
  });
  lines.push('', `*Subtotal:* ${money(order.subtotal_pesewas)}`);
  lines.push(
    order.delivery_fee_pesewas == null
      ? '*Delivery:* fee to be confirmed'
      : `*Delivery:* ${order.delivery_fee_pesewas === 0 ? 'Free' : money(order.delivery_fee_pesewas)}${v.delivery === 'gctu' ? ' (GCTU campus)' : ''}`
  );
  if (order.delivery_fee_pesewas != null) lines.push(`*Total:* ${money(order.total_pesewas)}`);
  lines.push('', '*MY DETAILS*', `Name: ${v.name}`, `Phone: ${v.phone}`,
    `Delivery: ${v.delivery === 'gctu' ? 'GCTU campus' : v.delivery === 'accra' ? 'Within Accra' : 'Nationwide'}`,
    `Region: ${region}`, `Location: ${v.location}`);
  if (v.notes) lines.push(`Notes: ${v.notes}`);
  if (v.delivery === 'gctu') lines.push('', 'GCTU');
  lines.push('', v.payment === 'paystack' ? 'I am paying online with Paystack.' : 'Please confirm availability, delivery and payment details. Thank you!');
  const { data: settingsRow } = await supabase.from('store_settings').select('whatsapp_number').maybeSingle();
  const whatsappUrl = waLink(settingsRow?.whatsapp_number || DEFAULT_SETTINGS.whatsappNumber, lines.join('\n'));

  let paystackUrl: string | undefined;
  if (v.payment === 'paystack') {
    const reference = `${order.order_number}-${crypto.randomUUID().slice(0, 8)}`;
    try {
      const { error: refErr } = await supabase.rpc('set_paystack_reference', { p_order: order.order_id, p_reference: reference });
      if (refErr) throw refErr;
      const tx = await initializeTransaction({
        email: v.email,
        amountPesewas: order.total_pesewas,
        reference,
        callbackUrl: `${publicEnv.siteUrl}/api/paystack/callback`,
        metadata: { order_number: order.order_number, customer_phone: v.phone }
      });
      paystackUrl = tx.authorization_url;
    } catch (e) {
      log.error('paystack.initialize_failed', e);
      return {
        ok: false,
        error: `Order ${order.order_number} was saved, but online payment could not start. Please send it on WhatsApp instead and we'll arrange payment.`
      };
    }
  }

  return { ok: true, orderNumber: order.order_number, whatsappUrl, paystackUrl, totalPesewas: order.total_pesewas, feeKnown: order.delivery_fee_pesewas != null };
}

export async function paystackAvailable(): Promise<boolean> {
  return serverEnv.paystackEnabled();
}
