import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog';
import { Shop } from '@/components/store/Shop';

export const metadata: Metadata = {
  title: 'Shop Luxury Perfumes & Fragrances',
  description:
    'Shop the Classy Luxe boutique: luxury perfumes, body splash, oil perfumes and more. Student and General collections, nationwide delivery across Ghana and free GCTU campus delivery.',
  alternates: { canonical: '/shop' }
};

export default async function ShopPage() {
  const { categories, products } = await getCatalog();
  return (
    <section className="section shop" id="shop" aria-labelledby="shopTitle" style={{ paddingTop: 'clamp(120px, 12vw, 170px)' }}>
      <div className="container">
        <header className="section-head shop-head">
          <p className="eyebrow reveal">The Boutique</p>
          <h1 className="h2 reveal d1" id="shopTitle">Shop <em>Classy Luxe</em></h1>
          <p className="lead reveal d2 mx-auto mt-5 text-center">
            {products.length} fragrance{products.length === 1 ? '' : 's'} across our Student and General collections — filter by category, price or scent note to find yours.
          </p>
        </header>
        <Shop categories={categories} />
      </div>
    </section>
  );
}
