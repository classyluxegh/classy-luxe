import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalog, getProductBySlug } from '@/lib/catalog';
import { displayName, minPrice } from '@/lib/types';
import { money } from '@/lib/money';
import { COLLECTIONS } from '@/lib/site';
import { publicEnv } from '@/lib/env';
import { ProductDetail } from '@/components/store/ProductDetail';
import { ProductCard } from '@/components/store/ProductCard';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const { products } = await getCatalog();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return []; // build without DB access: pages render on demand
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: 'Product not found' };
  const title = `${displayName(p)} — ${money(minPrice(p))}`;
  const description = `${displayName(p)} (${COLLECTIONS[p.collection].name}, ${p.variants.map((v) => v.label).filter(Boolean).join(' / ')}). ${p.description || 'Luxury fragrance from Classy Luxe, Accra.'}`.slice(0, 300);
  return {
    title,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title, description, images: p.images[0] ? [{ url: p.images[0].url }] : undefined }
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { products, settings } = await getCatalog();
  const p = products.find((x) => x.slug === slug);
  if (!p) notFound();

  const related = products
    .filter((x) => x.id !== p.id && x.collection === p.collection)
    .sort((a, b) => Math.abs(minPrice(a) - minPrice(p)) - Math.abs(minPrice(b) - minPrice(p)))
    .slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: displayName(p),
    description: p.description || undefined,
    image: p.images.map((i) => i.url),
    category: p.category.name,
    brand: { '@type': 'Brand', name: settings.businessName },
    offers: p.variants.map((v) => ({
      '@type': 'Offer',
      price: (v.pricePesewas / 100).toFixed(2),
      priceCurrency: 'GHS',
      availability: v.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${publicEnv.siteUrl}/product/${p.slug}`,
      name: v.label || undefined
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductDetail product={p} />
      {related.length > 0 && (
        <section className="pdp-related">
          <div className="container">
            <h2>You may <em>also love</em></h2>
            <div className="product-grid">{related.map((r, i) => <ProductCard key={r.id} product={r} index={i} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}
