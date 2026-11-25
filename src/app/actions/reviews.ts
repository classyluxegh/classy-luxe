'use server';

import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { log } from '@/lib/log';

const schema = z.object({
  productSlug: z.string().regex(/^[a-z0-9-]{1,80}$/),
  orderNumber: z.string().trim().toUpperCase().regex(/^CL-\d{1,10}$/, 'Order numbers look like CL-1234'),
  phone: z.string().trim().min(9).max(20),
  name: z.string().trim().min(1, 'Please add a name').max(60),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10, 'Please write at least 10 characters').max(1500)
});

const MESSAGES: Record<string, string> = {
  SUBMITTED: 'Thank you! Your review will appear once it has been approved.',
  ALREADY_REVIEWED: 'You have already reviewed this product for that order.',
  NOT_DELIVERED: 'You can review this product once your order has been delivered.',
  NOT_PURCHASED: 'That order does not include this product.',
  NOT_VERIFIED: 'We could not match that order number and phone number.',
  DISABLED: 'Reviews are currently closed.'
};

export async function submitReview(input: z.input<typeof schema>): Promise<{ ok: boolean; message: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const v = parsed.data;
  const { data, error } = await createServiceClient().rpc('submit_review', {
    p_order_number: v.orderNumber, p_phone: v.phone, p_product_slug: v.productSlug, p_name: v.name, p_rating: v.rating, p_body: v.body
  });
  if (error) {
    log.error('review.submit_failed', { message: error.message });
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
  log.info('review.submitted', { result: data, product: v.productSlug });
  return { ok: data === 'SUBMITTED', message: MESSAGES[String(data)] || 'Something went wrong. Please try again.' };
}
