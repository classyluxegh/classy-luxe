import Image from 'next/image';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { Badge, Flash, PageHead, btnDark, input } from '@/components/admin/ui';

type Props = { searchParams: Promise<{ q?: string; ok?: string; error?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const { q = '', ok, error } = await searchParams;
  const { supabase } = await requireAdmin('manager');
  let query = supabase
    .from('products')
    .select('id, slug, name, variant_label, collection, is_active, is_featured, badge, category:categories(name), product_variants(label, price_pesewas, track_inventory, stock), product_images(url, sort_order)');
  if (q.trim()) query = query.ilike('name', `%${q.trim().replace(/[%_]/g, '')}%`);
  const { data: products, error: loadErr } = await query.order('sort_order').order('name');

  return (
    <>
      <PageHead title="Products" sub={`${products?.length ?? 0} products`} action={<Link href="/admin/products/new" className={btnDark}>+ Add product</Link>} />
      <Flash ok={ok} error={error || loadErr?.message} />
      <form className="mb-6 flex max-w-md gap-2"><input name="q" defaultValue={q} placeholder="Search products…" className={input} aria-label="Search products" /></form>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ivory text-left text-[.68rem] uppercase tracking-[.14em] text-muted">
            <tr><th className="p-3">Product</th><th className="p-3">Collection</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {(products || []).map((p) => {
              const img = [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
              const vs = p.product_variants || [];
              const tracked = vs.filter((v) => v.track_inventory);
              const cat = p.category as unknown as { name: string } | null;
              return (
                <tr key={p.id} className="border-t border-line hover:bg-ivory-2">
                  <td className="p-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="relative h-12 w-10 shrink-0 overflow-hidden bg-beige">{img && <Image src={img.url} alt="" fill sizes="40px" className="object-cover" />}</span>
                      <span><span className="font-medium text-ink hover:text-gold-deep">{p.name}</span>{p.variant_label && <span className="block text-xs text-muted">{p.variant_label}</span>}</span>
                    </Link>
                  </td>
                  <td className="p-3 capitalize">{p.collection}</td>
                  <td className="p-3">{cat?.name}</td>
                  <td className="p-3 whitespace-nowrap">{vs.map((v) => `${money(v.price_pesewas)}${v.label ? ` (${v.label})` : ''}`).join(', ')}</td>
                  <td className="p-3">{tracked.length ? (() => { const n = tracked.reduce((t, v) => t + v.stock, 0); return n === 0 ? <Badge tone="bad">Out of stock</Badge> : n; })() : <span className="text-muted">Not tracked</span>}</td>
                  <td className="p-3 space-x-1">{p.is_active ? <Badge tone="good">Live</Badge> : <Badge>Hidden</Badge>}{p.is_featured && <Badge tone="gold">Featured</Badge>}{p.badge && <Badge>{p.badge}</Badge>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!products?.length && <p className="p-6 text-sm text-muted">No products found.</p>}
      </div>
    </>
  );
}
