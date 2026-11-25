import Image from 'next/image';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { COLLECTIONS } from '@/lib/site';
import { Flash, btnAdd, PlusIcon } from '@/components/admin/ui';
import { SuggestSearch, type Suggestion } from '@/components/admin/SuggestSearch';
import { Modal } from '@/components/admin/Modal';
import { ProductForm } from '@/components/admin/ProductForm';

type Props = { searchParams: Promise<{ q?: string; show?: string; ok?: string; error?: string }> };

const SHOWS = {
  all: 'All',
  live: 'Live',
  hidden: 'Hidden',
  featured: 'Featured',
  student: 'Student collection',
  general: 'General collection'
} as const;
type Show = keyof typeof SHOWS;

type Product = {
  id: string; slug: string; name: string; variant_label: string | null; collection: 'student' | 'general';
  is_active: boolean; is_featured: boolean; badge: string | null;
  category: { name: string } | null;
  product_variants: { label: string; price_pesewas: number; track_inventory: boolean; stock: number; is_active: boolean }[];
  product_images: { url: string; sort_order: number }[];
};

export default async function ProductsPage({ searchParams }: Props) {
  const { q = '', show: showParam, ok, error } = await searchParams;
  const show: Show = showParam && showParam in SHOWS ? (showParam as Show) : 'all';
  const term = q.trim().replace(/[%_]/g, '');
  const { supabase } = await requireAdmin('manager');

  let query = supabase
    .from('products')
    .select('id, slug, name, variant_label, collection, is_active, is_featured, badge, category:categories(name), product_variants(label, price_pesewas, track_inventory, stock, is_active), product_images(url, sort_order)');
  if (term) query = query.ilike('name', `%${term}%`);
  if (show === 'live') query = query.eq('is_active', true);
  if (show === 'hidden') query = query.eq('is_active', false);
  if (show === 'featured') query = query.eq('is_featured', true);
  if (show === 'student' || show === 'general') query = query.eq('collection', show);

  const [{ data, error: loadErr }, { data: everything }, { data: categories }] = await Promise.all([
    query.order('sort_order').order('name'),
    supabase.from('products').select('id, name, variant_label, collection, is_active, is_featured').order('name'),
    supabase.from('categories').select('id, name').order('sort_order')
  ]);
  const addProduct = (className: string, label: React.ReactNode) => (
    <Modal trigger={label} triggerClassName={className} eyebrow="Catalogue" title="Add a new fragrance" size="lg" openParam="product"
      subtitle="Fill in the details below. You can add photos now or later.">
      <ProductForm categories={categories || []} />
    </Modal>
  );
  const products = (data || []) as unknown as Product[];
  const all = everything || [];

  const counts: Record<Show, number> = {
    all: all.length,
    live: all.filter((p) => p.is_active).length,
    hidden: all.filter((p) => !p.is_active).length,
    featured: all.filter((p) => p.is_featured).length,
    student: all.filter((p) => p.collection === 'student').length,
    general: all.filter((p) => p.collection === 'general').length
  };

  const suggestions: Suggestion[] = all.map((p) => ({
    label: p.name,
    sub: [p.variant_label, COLLECTIONS[p.collection as 'student' | 'general']?.name, p.is_active ? null : 'Hidden'].filter(Boolean).join(' · '),
    href: `/admin/products/${p.id}`
  }));
  const showHref = (s: Show) => `/admin/products?${new URLSearchParams({ ...(s !== 'all' ? { show: s } : {}), ...(term ? { q: term } : {}) })}`;

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[.66rem] uppercase tracking-[.26em] text-gold-deep">Catalogue</p>
          <h1 className="mt-1 font-serif text-[clamp(2rem,3.2vw,2.8rem)] font-light leading-none">Products</h1>
          <p className="mt-2 text-sm text-muted">Every fragrance in the shop — prices, sizes, photos and visibility.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <SuggestSearch items={suggestions} defaultValue={term} placeholder="Search products…" ariaLabel="Search products"
            hidden={{ show: show !== 'all' ? show : undefined }}
            clearHref={show !== 'all' ? `/admin/products?show=${show}` : '/admin/products'} />
          {addProduct(btnAdd, <><PlusIcon />Add product</>)}
        </div>
      </div>

      <Flash ok={ok} error={error || loadErr?.message} />

      {/* ── Summary ──────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Products" value={String(counts.all)} hint={`${counts.student} student · ${counts.general} general`} dark />
        <Stat label="Live in shop" value={String(counts.live)} hint="Customers can see and order these" />
        <Stat label="Hidden" value={String(counts.hidden)} hint="Not shown in the shop" />
        <Stat label="Featured" value={String(counts.featured)} hint="Shown first and on the homepage" />
      </section>

      {/* ── Filters ──────────────────────────────────── */}
      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Filter products">
        {(Object.keys(SHOWS) as Show[]).map((s) => (
          <Link key={s} href={showHref(s)} aria-current={show === s ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors ${show === s ? 'border-ink bg-ink text-ivory' : 'border-line bg-white text-ink hover:border-ink'}`}>
            {SHOWS[s]}
            <span className={`rounded-full px-1.5 text-[.65rem] ${show === s ? 'bg-ivory/20' : 'bg-ivory text-muted'}`}>{counts[s]}</span>
          </Link>
        ))}
      </nav>

      {/* ── Gallery ──────────────────────────────────── */}
      {products.length ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {products.map((p) => {
            const img = [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
            const sizes = (p.product_variants || []).filter((v) => v.is_active);
            const prices = sizes.map((v) => v.price_pesewas);
            const lo = prices.length ? Math.min(...prices) : 0;
            const hi = prices.length ? Math.max(...prices) : 0;
            const tracked = sizes.filter((v) => v.track_inventory);
            const stock = tracked.reduce((n, v) => n + v.stock, 0);
            return (
              <article key={p.id} data-search={p.name.toLowerCase()} className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white">
                <Link href={`/admin/products/${p.id}`} className="relative block aspect-[4/5] overflow-hidden bg-sand" aria-label={`Edit ${p.name}`}>
                  {img
                    ? <Image src={img.url} alt="" fill sizes="(min-width:1536px) 22vw, (min-width:1024px) 30vw, (min-width:640px) 45vw, 90vw" className={`object-cover transition-transform duration-700 group-hover:scale-[1.04] ${p.is_active ? '' : 'opacity-60 grayscale-[.4]'}`} />
                    : <span className="flex h-full w-full items-center justify-center font-serif text-6xl font-light text-gold-deep/60">{p.name[0]}</span>}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {p.is_featured && <Tag tone="gold">★ Featured</Tag>}
                    {p.badge && <Tag>{p.badge}</Tag>}
                  </div>
                  <span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[.62rem] uppercase tracking-[.14em] backdrop-blur ${p.is_active ? 'bg-white/85 text-[#1F7A4D]' : 'bg-ink/75 text-ivory'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${p.is_active ? 'bg-[#1F7A4D]' : 'bg-ivory/60'}`} />{p.is_active ? 'Live' : 'Hidden'}
                  </span>
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[.62rem] uppercase tracking-[.2em] text-muted">{COLLECTIONS[p.collection]?.short}{p.category?.name ? ` · ${p.category.name}` : ''}</p>
                  <h2 className="mt-1 font-serif text-2xl font-light leading-tight">
                    <Link href={`/admin/products/${p.id}`} className="hover:text-gold-deep">{p.name}</Link>
                  </h2>
                  <p className="mt-2 font-serif text-lg text-ink">
                    {prices.length ? (lo === hi ? money(lo) : <>{money(lo)} <span className="text-sm text-muted">–</span> {money(hi)}</>) : <span className="text-sm text-muted">No sizes on sale</span>}
                  </p>

                  {sizes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {sizes.map((v, i) => (
                        <span key={i} className="rounded-full border border-line px-2.5 py-0.5 text-[.7rem] text-muted">{v.label || 'One size'}</span>
                      ))}
                    </div>
                  )}

                  <p className={`mt-3 text-xs ${tracked.length && stock === 0 ? 'text-danger' : tracked.length && stock <= 3 ? 'text-gold-deep' : 'text-muted'}`}>
                    {tracked.length ? (stock === 0 ? 'Sold out' : `${stock} in stock`) : 'Always available'}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-xs">
                    <Link href={`/admin/products/${p.id}`} className="group/edit inline-flex items-center gap-1.5 text-ink hover:text-gold-deep">Edit <span aria-hidden="true" className="transition-transform group-hover/edit:translate-x-0.5">→</span></Link>
                    {p.is_active && <Link href={`/product/${p.slug}`} target="_blank" className="text-muted hover:text-gold-deep">View in shop ↗</Link>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-white p-12 text-center">
          <p className="font-serif text-2xl font-light">{term ? `No products match “${term}”` : 'No products here yet'}</p>
          <p className="mt-2 text-sm text-muted">{term ? 'Try another name, or clear the search.' : 'Add your first fragrance to start selling.'}</p>
          <div className="mt-5">{addProduct('inline-flex h-10 items-center rounded-full bg-ink px-5 text-[.7rem] uppercase tracking-[.16em] text-ivory hover:bg-gold hover:text-ink', '+ Add product')}</div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint, dark }: { label: string; value: string; hint: string; dark?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${dark ? 'border-ink bg-charcoal' : 'border-line bg-white'}`}>
      <p className={`text-[.62rem] uppercase tracking-[.22em] ${dark ? 'text-gold' : 'text-muted'}`}>{label}</p>
      <p className={`mt-2 font-serif text-[1.9rem] leading-none ${dark ? 'text-ivory' : 'text-ink'}`}>{value}</p>
      <p className={`mt-2 truncate text-xs ${dark ? 'text-ivory/55' : 'text-muted'}`}>{hint}</p>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'gold' }) {
  return <span className={`rounded-full px-2.5 py-1 text-[.62rem] uppercase tracking-[.14em] backdrop-blur ${tone === 'gold' ? 'bg-ink/80 text-gold-light' : 'bg-white/85 text-ink'}`}>{children}</span>;
}
