import 'server-only';
import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';
import { DEFAULT_SETTINGS } from '@/lib/site';
import type { Badge, Catalog, Collection, DeliveryOption, Product, Review, StoreSettings } from '@/lib/types';
import { log } from '@/lib/log';

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  variant_label: string | null;
  collection: Collection;
  description: string | null;
  notes: string[] | null;
  badge: Badge | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  category: { slug: string; name: string; is_active: boolean } | null;
  product_variants: { id: string; label: string; price_pesewas: number; track_inventory: boolean; stock: number; is_active: boolean; sort_order: number }[];
  product_images: { url: string; alt: string | null; sort_order: number }[];
}

function mapProduct(r: ProductRow): Product | null {
  const variants = (r.product_variants || [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.price_pesewas - b.price_pesewas)
    .map((v) => ({
      id: v.id,
      label: v.label,
      pricePesewas: v.price_pesewas,
      inStock: !v.track_inventory || v.stock > 0,
      stock: v.track_inventory ? v.stock : null
    }));
  if (!variants.length || !r.category) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    variantLabel: r.variant_label,
    collection: r.collection,
    category: { slug: r.category.slug, name: r.category.name },
    description: r.description,
    notes: r.notes || [],
    badge: r.badge,
    isFeatured: r.is_featured,
    createdAt: r.created_at,
    images: (r.product_images || []).sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ url: i.url, alt: i.alt })),
    variants,
    available: variants.some((v) => v.inStock)
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSettings(row: any): StoreSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    businessName: row.business_name,
    tagline: row.tagline,
    whatsappNumber: row.whatsapp_number,
    whatsappDisplay: row.whatsapp_display,
    phoneNumber: row.phone_number,
    phoneDisplay: row.phone_display,
    email: row.email,
    instagramUrl: row.instagram_url,
    instagramHandle: row.instagram_handle,
    snapchatHandle: row.snapchat_handle,
    tiktokUrl: row.tiktok_url,
    facebookUrl: row.facebook_url,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    businessHours: row.business_hours,
    businessHoursShort: row.business_hours_short,
    deliveryInfo: row.delivery_info,
    studentDeliveryInfo: row.student_delivery_info,
    aboutText: row.about_text,
    privacyPolicy: row.privacy_policy,
    termsConditions: row.terms_conditions,
    returnsPolicy: row.returns_policy,
    reviewsEnabled: row.reviews_enabled,
    lowStockThreshold: row.low_stock_threshold
  };
}

/** Whole public catalogue — small enough to load in one round trip. Cached per request. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const supabase = createPublicClient();
  const [productsRes, categoriesRes, ratesRes, settingsRes] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, slug, name, variant_label, collection, description, notes, badge, is_featured, sort_order, created_at, category:categories(slug, name, is_active), product_variants(id, label, price_pesewas, track_inventory, stock, is_active, sort_order), product_images(url, alt, sort_order)'
      )
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('categories').select('id, slug, name, description, image_url, sort_order').eq('is_active', true).order('sort_order'),
    supabase.from('delivery_rates').select('option, region, fee_pesewas'),
    supabase.from('store_settings').select('*').maybeSingle()
  ]);
  if (productsRes.error) { log.error('catalog.products', productsRes.error); throw new Error('Could not load products'); }
  if (categoriesRes.error) { log.error('catalog.categories', categoriesRes.error); throw new Error('Could not load categories'); }
  if (settingsRes.error) log.warn('catalog.settings', settingsRes.error);

  const products = ((productsRes.data || []) as unknown as ProductRow[])
    .filter((r) => r.category?.is_active !== false)
    .map(mapProduct)
    .filter((p): p is Product => !!p);
  const categories = (categoriesRes.data || []).map((c) => ({
    id: c.id as string,
    slug: c.slug as string,
    name: c.name as string,
    description: (c.description as string) || null,
    imageUrl: (c.image_url as string) || null,
    sortOrder: c.sort_order as number,
    productCount: products.filter((p) => p.category.slug === c.slug).length
  }));
  const deliveryRates = (ratesRes.data || []).map((r) => ({
    option: r.option as DeliveryOption,
    region: (r.region as string) || null,
    feePesewas: r.fee_pesewas as number | null
  }));
  return { products, categories, deliveryRates, settings: mapSettings(settingsRes.data) };
});

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { products } = await getCatalog();
  return products.find((p) => p.slug === slug) || null;
}

/** Approved reviews only (enforced by RLS and column grants). */
export async function getApprovedReviews(productId: string): Promise<Review[]> {
  const { data, error } = await createPublicClient()
    .from('reviews')
    .select('id, customer_name, rating, body, created_at')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { log.warn('catalog.reviews', error); return []; }
  return (data || []).map((r) => ({ id: r.id, customerName: r.customer_name, rating: r.rating, body: r.body, createdAt: r.created_at }));
}
