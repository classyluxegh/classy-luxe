'use client';

import { useActionState, useState } from 'react';
import { saveProduct, type ProductFormState } from '@/app/admin/(dashboard)/actions';
import { slugify } from '@/lib/validation';
import { btnDark, btnOutline, input } from './ui';

interface VariantRow { id?: string; label: string; price: number | string; isActive: boolean }
interface Initial {
  id: string; name: string; slug: string; variantLabel: string; collection: 'student' | 'general'; categoryId: string;
  description: string; notes: string; badge: string; isActive: boolean; isFeatured: boolean; sortOrder: number; variants: VariantRow[];
}

export function ProductForm({ categories, product }: { categories: { id: string; name: string }[]; product?: Initial }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, undefined);
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [variants, setVariants] = useState<VariantRow[]>(product?.variants.length ? product.variants : [{ label: '', price: '', isActive: true }]);
  const fe = state?.fieldErrors || {};

  const label = 'block text-[.68rem] uppercase tracking-[.16em] text-muted';
  const err = (k: string) => fe[k] && <p className="mt-1 text-xs text-danger">{fe[k]}</p>;

  return (
    <form action={action} className="max-w-4xl space-y-8">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants.map((v) => ({ ...v, price: Number(v.price) })))} />
      {state?.error && <p role="alert" className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p>}

      <section className="grid gap-5 border border-line bg-white p-6 md:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">Product name</label>
          <input id="name" name="name" required maxLength={120} className={`${input} mt-2`} value={name}
            onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
          {err('name')}
        </div>
        <div>
          <label className={label} htmlFor="slug">Web address</label>
          <div className="mt-2 flex items-center"><span className="pr-2 text-sm text-muted">/product/</span>
            <input id="slug" name="slug" required className={input} value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
          </div>
          {err('slug')}
        </div>
        <div>
          <label className={label} htmlFor="variantLabel">Edition / subtitle <span className="normal-case tracking-normal">(optional)</span></label>
          <input id="variantLabel" name="variantLabel" maxLength={80} className={`${input} mt-2`} defaultValue={product?.variantLabel} placeholder="e.g. Burlap pouch edition" />
        </div>
        <div>
          <label className={label} htmlFor="categoryId">Category</label>
          <select id="categoryId" name="categoryId" required className={`${input} mt-2`} defaultValue={product?.categoryId || ''}>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {err('categoryId')}
        </div>
        <fieldset>
          <legend className={label}>Collection</legend>
          <div className="mt-3 flex gap-5 text-sm">
            {(['student', 'general'] as const).map((c) => (
              <label key={c} className="flex items-center gap-2 capitalize"><input type="radio" name="collection" value={c} defaultChecked={(product?.collection || 'general') === c} />{c}</label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className={label} htmlFor="badge">Badge</label>
          <select id="badge" name="badge" className={`${input} mt-2`} defaultValue={product?.badge || ''}>
            <option value="">None</option><option>Bestseller</option><option>New Arrival</option><option>Popular</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={label} htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={4} maxLength={2000} className={`${input} mt-2 h-auto py-2`} defaultValue={product?.description} />
        </div>
        <div className="md:col-span-2">
          <label className={label} htmlFor="notes">Scent notes <span className="normal-case tracking-normal">(comma separated)</span></label>
          <input id="notes" name="notes" maxLength={400} className={`${input} mt-2`} defaultValue={product?.notes} placeholder="Saffron, Vanilla, Musk" />
        </div>
        <div>
          <label className={label} htmlFor="sortOrder">Display order</label>
          <input id="sortOrder" name="sortOrder" type="number" min={0} className={`${input} mt-2`} defaultValue={product?.sortOrder ?? 0} />
        </div>
        <div className="flex flex-col gap-3 self-end text-sm">
          <label className="flex items-center gap-3"><input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} className="h-4 w-4 accent-ink" />Active — show in the shop</label>
          <label className="flex items-center gap-3"><input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} className="h-4 w-4 accent-ink" />Featured — shown first and used in homepage imagery</label>
        </div>
      </section>

      <section className="border border-line bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div><h2 className="font-serif text-2xl">Sizes &amp; prices</h2><p className="text-xs text-muted">Prices in GH₵. Stock is managed under Inventory.</p></div>
          <button type="button" className={btnOutline} onClick={() => setVariants([...variants, { label: '', price: '', isActive: true }])} disabled={variants.length >= 10}>+ Add size</button>
        </div>
        {err('variants')}
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div key={v.id || `new-${i}`} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-3">
              <input aria-label="Size" placeholder="Size, e.g. 50ml" className={input} value={v.label} maxLength={40}
                onChange={(e) => setVariants(variants.map((x, k) => k === i ? { ...x, label: e.target.value } : x))} />
              <div className="flex items-center gap-2"><span className="text-sm text-muted">GH₵</span>
                <input aria-label="Price in cedis" type="number" min={0} step="0.01" required className={input} value={v.price}
                  onChange={(e) => setVariants(variants.map((x, k) => k === i ? { ...x, price: e.target.value } : x))} />
              </div>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={v.isActive} onChange={(e) => setVariants(variants.map((x, k) => k === i ? { ...x, isActive: e.target.checked } : x))} />Live</label>
              <button type="button" aria-label="Remove size" className="px-2 text-danger disabled:opacity-30" disabled={variants.length === 1}
                onClick={() => setVariants(variants.filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-line bg-white p-6">
        <h2 className="font-serif text-2xl">Upload images</h2>
        <p className="mb-3 text-xs text-muted">JPG, PNG, WebP or AVIF · up to 5 MB each · up to 8 at a time. Portrait (4:5) photos look best.</p>
        <input type="file" name="images" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" />
      </section>

      <div className="flex gap-3">
        <button className={btnDark} disabled={pending}>{pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}</button>
      </div>
    </form>
  );
}
