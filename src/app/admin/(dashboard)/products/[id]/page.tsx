import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { Flash, PageHead, btnDanger, btnOutline } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { deleteImage, deleteProduct, makeImagePrimary } from '../../actions';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function EditProduct({ params, searchParams }: Props) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin('manager');
  const [{ data: p }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*, product_variants(id, label, price_pesewas, is_active, sort_order), product_images(id, url, sort_order)').eq('id', id).maybeSingle(),
    supabase.from('categories').select('id, name').order('sort_order')
  ]);
  if (!p) notFound();
  const images = [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <PageHead title={p.name} sub={p.is_active ? 'Live in the shop' : 'Hidden from the shop'}
        action={<div className="flex gap-2">
          {p.is_active && <Link href={`/product/${p.slug}`} target="_blank" className={btnOutline}>View in shop ↗</Link>}
          <form action={deleteProduct}><input type="hidden" name="id" value={p.id} /><ConfirmButton className={btnDanger} message={`Delete ${p.name}? This cannot be undone. Past orders keep their details.`}>Delete</ConfirmButton></form>
        </div>} />
      <Flash ok={ok} error={error} />

      <section className="mb-8">
        <h2 className="mb-3 text-[.7rem] uppercase tracking-[.18em] text-muted">Images</h2>
        {images.length ? (
          <ul className="flex flex-wrap gap-4">
            {images.map((img, i) => (
              <li key={img.id} className="w-32">
                <div className="relative aspect-[4/5] overflow-hidden bg-beige"><Image src={img.url} alt="" fill sizes="128px" className="object-cover" /></div>
                <div className="mt-2 flex justify-between text-xs">
                  {i === 0 ? <span className="text-gold-deep">Main image</span> : (
                    <form action={makeImagePrimary}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="productId" value={p.id} /><button className="hover:text-gold-deep">Make main</button></form>
                  )}
                  <form action={deleteImage}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="productId" value={p.id} /><ConfirmButton className="text-danger hover:underline" message="Remove this image?">Remove</ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No images yet — upload some below.</p>}
      </section>

      <ProductForm
        categories={categories || []}
        product={{
          id: p.id, name: p.name, slug: p.slug, variantLabel: p.variant_label || '', collection: p.collection, categoryId: p.category_id,
          description: p.description || '', notes: (p.notes || []).join(', '), badge: p.badge || '', isActive: p.is_active, isFeatured: p.is_featured, sortOrder: p.sort_order,
          variants: [...(p.product_variants || [])].sort((a, b) => a.sort_order - b.sort_order).map((v) => ({ id: v.id, label: v.label, price: v.price_pesewas / 100, isActive: v.is_active }))
        }}
      />
    </>
  );
}
