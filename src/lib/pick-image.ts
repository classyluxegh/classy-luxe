import type { Product } from '@/lib/types';

/** Photo of a given product (by slug), or of another product with a photo as a fallback. */
export function pickImage(products: Product[], slug: string, fallbackIndex: number) {
  const withImg = products.filter((p) => p.images.length);
  const p = products.find((x) => x.slug === slug && x.images.length) || withImg[fallbackIndex % Math.max(1, withImg.length)];
  return p ? { src: p.images[0].url, alt: p.images[0].alt || p.name, name: p.name } : { src: null, alt: '', name: '' };
}
