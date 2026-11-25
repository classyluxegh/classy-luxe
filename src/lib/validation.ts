import { z } from 'zod';

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes only');

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

/** Accepts 024 000 0000, +233 24 000 0000, 233240000000 … returns digits with optional + */
export function normalisePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return null;
  return (trimmed.startsWith('+') ? '+' : '') + digits;
}

export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your name').max(120),
    phone: z.string().trim().transform((v, ctx) => {
      const p = normalisePhone(v);
      if (!p) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please enter a valid phone number, e.g. 024 000 0000' }); return z.NEVER; }
      return p;
    }),
    delivery: z.enum(['gctu', 'accra', 'region']),
    region: z.string().trim().max(60).optional().default(''),
    location: z.string().trim().min(3, 'Please tell us where to deliver').max(300),
    notes: z.string().trim().max(1000).optional().default(''),
    payment: z.enum(['whatsapp', 'paystack']),
    email: z.string().trim().max(160).optional().default(''),
    website: z.string().max(0).optional().default(''), // honeypot: must stay empty
    items: z
      .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) }))
      .min(1, 'Your bag is empty')
      .max(30)
  })
  .superRefine((v, ctx) => {
    if (v.delivery === 'region' && !v.region) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['region'], message: 'Please choose a region' });
    if (v.payment === 'paystack' && !z.string().email().safeParse(v.email).success)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Paystack needs an email address for your receipt' });
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;

export const variantInputSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(40),
  price: z.coerce.number().min(0, 'Price cannot be negative').max(1_000_000),
  isActive: z.boolean().default(true)
});

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: slugSchema,
  variantLabel: z.string().trim().max(80).optional().transform((v) => v || null),
  collection: z.enum(['student', 'general']),
  categoryId: z.string().uuid('Choose a category'),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  notes: z.string().max(400).optional().transform((v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12)),
  badge: z.enum(['', 'Bestseller', 'New Arrival', 'Popular']).transform((v) => v || null),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  variants: z.array(variantInputSchema).min(1, 'Add at least one size/price').max(10)
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  slug: slugSchema,
  description: z.string().trim().max(300).optional().transform((v) => v || null),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean()
});

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const optionalUrl = z.string().trim().max(300).optional().transform((v) => v || null)
  .refine((v) => v === null || /^https:\/\/[^\s]+$/.test(v), 'Links must start with https://');

export const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(80),
  tagline: z.string().trim().min(1).max(120),
  whatsappNumber: z.string().transform((v) => v.replace(/\D/g, '')).refine((v) => /^[1-9][0-9]{8,14}$/.test(v), 'WhatsApp number must be in international format without the leading 0, e.g. 233248751541'),
  whatsappDisplay: z.string().trim().min(1).max(40),
  phoneNumber: optionalText(20),
  phoneDisplay: optionalText(40),
  email: z.string().trim().max(160).optional().transform((v) => v || null).refine((v) => v === null || z.string().email().safeParse(v).success, 'Enter a valid email'),
  instagramUrl: optionalUrl,
  instagramHandle: optionalText(60),
  snapchatHandle: optionalText(60),
  tiktokUrl: optionalUrl,
  facebookUrl: optionalUrl,
  addressLine1: optionalText(120),
  addressLine2: optionalText(120),
  businessHours: optionalText(120),
  businessHoursShort: optionalText(60),
  deliveryInfo: optionalText(600),
  studentDeliveryInfo: optionalText(600),
  aboutText: optionalText(2000),
  privacyPolicy: optionalText(20000),
  termsConditions: optionalText(20000),
  returnsPolicy: optionalText(20000),
  reviewsEnabled: z.boolean(),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000)
});

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
