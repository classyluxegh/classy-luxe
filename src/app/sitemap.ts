import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/catalog';
import { publicEnv } from '@/lib/env';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  let products: { slug: string }[] = [];
  try { products = (await getCatalog()).products; } catch { /* DB unavailable at build */ }
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    ...['privacy', 'terms', 'returns'].map((p) => ({ url: `${base}/${p}`, changeFrequency: 'monthly' as const, priority: 0.3 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 }))
  ];
}
