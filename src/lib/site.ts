import type { StoreSettings } from '@/lib/types';

/**
 * Fallback business details (from the previous website). The live values are
 * edited in Admin → Settings and stored in the `store_settings` table.
 */
export const DEFAULT_SETTINGS: StoreSettings = {
  businessName: 'Classy Luxe',
  tagline: 'The Scent of Elegance',
  whatsappNumber: '233248751541', // +233 024 875 1541, international format without the leading 0
  whatsappDisplay: '+233 024 875 1541',
  phoneNumber: '+233539460710',
  phoneDisplay: '+233 053 946 0710',
  email: null,
  instagramUrl: 'https://instagram.com/berryjohnson252',
  instagramHandle: '@berryjohnson252',
  snapchatHandle: 'berryjohnson252',
  tiktokUrl: null,
  facebookUrl: null,
  addressLine1: 'Alhaji Lapaz, Accra',
  addressLine2: 'Greater Accra Region, Ghana',
  businessHours: 'Monday – Saturday · 8:00 AM – 8:00 PM',
  businessHoursShort: 'Mon – Sat · 8AM – 8PM',
  deliveryInfo: 'Nationwide delivery to all 16 regions of Ghana. Discreet, secure packaging. WhatsApp tracking from dispatch to delivery. Estimated 1 – 3 business days.',
  studentDeliveryInfo: 'Free delivery within the GCTU campus area, Monday – Saturday, 8AM – 8PM. Mention "GCTU" when you message us on WhatsApp.',
  aboutText: null,
  privacyPolicy: null,
  termsConditions: null,
  returnsPolicy: null,
  reviewsEnabled: true,
  lowStockThreshold: 3
};

export const SITE_DESCRIPTION =
  'Classy Luxe — The Scent of Elegance. Authentic luxury perfumes, body splash, oil perfumes and more from Accra, with nationwide delivery across all 16 regions of Ghana and free GCTU campus delivery.';

export function waLink(number: string, text?: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export const REGIONS = ["Greater Accra", "Ashanti", "Central", "Eastern", "Western", "Western North", "Volta", "Oti", "Northern", "Savannah", "North East", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo"] as const;

export const COLLECTIONS = {
  student: { name: 'Student Collection', short: 'Student' },
  general: { name: 'General Collection', short: 'General' }
} as const;

/**
 * Customer testimonials (from the previous website).
 * To show a customer's real photo (only with their permission): put the image in
 * `public/testimonials/` — e.g. public/testimonials/abena.jpg — and set
 * photo: '/testimonials/abena.jpg'. Without a photo, their initials are shown.
 */
export interface Testimonial { name: string; place: string; text: string; photo: string | null }

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Abena Agyemang",
    place: "Accra",
    text: "I ordered Midnight Royale for my partner and it arrived same day in Accra. The scent is divine — people kept asking what he was wearing all evening!",
    photo: null
  },
  {
    name: "Emmanuel Kusi",
    place: "GCTU Student",
    text: "As a GCTU student the free delivery is a game changer. Rose Mystique has become my signature scent on campus — my friends always want to know where I got it!",
    photo: null
  },
  {
    name: "Fatima Al-Hassan",
    place: "Kumasi",
    text: "Oud Noir Prestige is worth every pesewa. I can't believe I'm getting this level of quality right here in Ghana. Classy Luxe is genuinely the real deal!",
    photo: null
  },
  {
    name: "Kwame Owusu",
    place: "Tema",
    text: "Ordered via WhatsApp and it was so seamless. Excellent communication, fast delivery to Tema, gorgeous packaging. Highly recommend Classy Luxe to everyone!",
    photo: null
  },
  {
    name: "Akosua Quaye",
    place: "Takoradi",
    text: "Golden Hour is absolutely stunning — warm, rich, and long-lasting. My colleagues in Takoradi kept complimenting me all day. Ordering again very soon!",
    photo: null
  },
  {
    name: "Mohammed Alhassan",
    place: "Tamale",
    text: "Emperor's Reserve smells like something from a high-end Dubai mall. Can't believe I'm getting that quality right here in Ghana. Will be a lifetime customer!",
    photo: null
  }
];
