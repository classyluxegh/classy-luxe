export type Collection = 'student' | 'general';
export type Badge = 'Bestseller' | 'New Arrival' | 'Popular';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type AdminRole = 'owner' | 'manager' | 'staff';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'whatsapp' | 'paystack';
export type DeliveryOption = 'gctu' | 'accra' | 'region';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  productCount: number;
}

export interface Variant {
  id: string;
  label: string;
  pricePesewas: number;
  inStock: boolean;
  /** null = stock not tracked (always available) */
  stock: number | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  variantLabel: string | null;
  collection: Collection;
  category: { slug: string; name: string };
  description: string | null;
  notes: string[];
  badge: Badge | null;
  isFeatured: boolean;
  createdAt: string;
  images: { url: string; alt: string | null }[];
  variants: Variant[];
  available: boolean;
}

export interface DeliveryRate {
  option: DeliveryOption;
  region: string | null;
  feePesewas: number | null;
}

export interface StoreSettings {
  businessName: string;
  tagline: string;
  whatsappNumber: string;
  whatsappDisplay: string;
  phoneNumber: string | null;
  phoneDisplay: string | null;
  email: string | null;
  instagramUrl: string | null;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  businessHours: string | null;
  businessHoursShort: string | null;
  deliveryInfo: string | null;
  studentDeliveryInfo: string | null;
  aboutText: string | null;
  privacyPolicy: string | null;
  termsConditions: string | null;
  returnsPolicy: string | null;
  reviewsEnabled: boolean;
  lowStockThreshold: number;
}

export interface Catalog {
  products: Product[];
  categories: Category[];
  deliveryRates: DeliveryRate[];
  settings: StoreSettings;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  body: string;
  createdAt: string;
}

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready_for_delivery', label: 'Ready for delivery' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' }
];

export function displayName(p: Pick<Product, 'name' | 'variantLabel'>): string {
  return p.variantLabel ? `${p.name} — ${p.variantLabel}` : p.name;
}

export function minPrice(p: Product): number {
  return Math.min(...p.variants.map((v) => v.pricePesewas));
}
