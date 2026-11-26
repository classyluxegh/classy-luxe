'use client';

import { useActionState, useEffect, useState } from 'react';
import { saveProduct, type ProductFormState } from '@/app/admin/(dashboard)/actions';
import { slugify } from '@/lib/validation';
import { FormFooter, ModalCancel, useModal } from './Modal';

interface VariantRow { id?: string; label: string; price: number | string; isActive: boolean }
interface Initial {
  id: string; name: string; slug: string; variantLabel: string; collection: 'student' | 'general'; categoryId: string;
  description: string; notes: string; badge: string; isActive: boolean; isFeatured: boolean; sortOrder: number; variants: VariantRow[];
}

const field = 'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-gold-deep';
const lbl = 'block text-[.64rem] uppercase tracking-[.18em] text-muted';
const BADGES = ['', 'Bestseller', 'New Arrival', 'Popular'];

export function ProductForm({ categories, product }: { categories: { id: string; name: string }[]; product?: Initial }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, undefined);
  const inModal = !!useModal();
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [variants, setVariants] = useState<VariantRow[]>(product?.variants.length ? product.variants : [{ label: '', price: '', isActive: true }]);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);
  const fe = state?.fieldErrors || {};
  const err = (k: string) => fe[k] && <p className="mt-1.5 text-xs text-danger">{fe[k]}</p>;
  const setVariant = (i: number, patch: Partial<VariantRow>) => setVariants(variants.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  return (
    <form action={action} className={`space-y-5 ${inModal ? '' : 'max-w-4xl'}`}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants.map((v) => ({ ...v, price: Number(v.price) })))} />
      {state?.error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p>}

      {/* 1 — The fragrance */}
      <Section n={1} title="The fragrance" hint="Name, category and collection">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl} htmlFor="name">Product name</label>
            <input id="name" name="name" required maxLength={120} placeholder="e.g. Yara" className={`${field} mt-2`} value={name}
              onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
            {err('name')}
          </div>
          <div>
            <label className={lbl} htmlFor="slug">Web address</label>
            <div className="mt-2 flex h-11 items-center overflow-hidden rounded-lg border border-line bg-white focus-within:border-gold-deep">
              <span className="border-r border-line bg-ivory px-3 text-xs text-muted">/product/</span>
              <input id="slug" name="slug" required className="h-full w-full bg-transparent px-3 text-sm text-ink outline-none" value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
            </div>
            {err('slug')}
          </div>
          <div>
            <label className={lbl} htmlFor="categoryId">Category</label>
            <select id="categoryId" name="categoryId" required className={`${field} mt-2`} defaultValue={product?.categoryId || ''}>
              <option value="" disabled>Choose a category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {err('categoryId')}
          </div>
          <div>
            <label className={lbl} htmlFor="variantLabel">Edition / subtitle <span className="normal-case tracking-normal">(optional)</span></label>
            <input id="variantLabel" name="variantLabel" maxLength={80} className={`${field} mt-2`} defaultValue={product?.variantLabel} placeholder="e.g. Burlap pouch edition" />
          </div>
          <fieldset>
            <legend className={lbl}>Collection</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([['general', 'General'], ['student', 'Student']] as const).map(([v, t]) => (
                <Choice key={v} name="collection" value={v} defaultChecked={(product?.collection || 'general') === v}>{t}</Choice>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={lbl}>Badge</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {BADGES.map((b) => <Choice key={b || 'none'} name="badge" value={b} defaultChecked={(product?.badge || '') === b} pill>{b || 'None'}</Choice>)}
            </div>
          </fieldset>
        </div>
      </Section>

      {/* 2 — Sizes & prices */}
      <Section n={2} title="Sizes & prices" hint="Prices in GH₵ · stock is managed under Inventory"
        action={<button type="button" disabled={variants.length >= 10}
          onClick={() => setVariants([...variants, { label: '', price: '', isActive: true }])}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-xs text-ink transition-colors hover:border-ink disabled:opacity-40">+ Add size</button>}>
        {err('variants')}
        <div className="space-y-2.5">
          {variants.map((v, i) => (
            <div key={v.id || `new-${i}`} className="grid grid-cols-2 items-center gap-2.5 rounded-lg bg-ivory/70 p-2.5 sm:grid-cols-[1fr_1fr_auto_auto]">
              <input aria-label="Size" placeholder="Size, e.g. 50ml" className={field} value={v.label} maxLength={40}
                onChange={(e) => setVariant(i, { label: e.target.value })} />
              <div className="flex h-11 items-center overflow-hidden rounded-lg border border-line bg-white focus-within:border-gold-deep">
                <span className="px-3 text-xs text-muted">GH₵</span>
                <input aria-label="Price in cedis" type="number" min={0} step="0.01" required placeholder="0.00" value={v.price}
                  className="h-full w-full bg-transparent pr-3 text-sm text-ink outline-none" onChange={(e) => setVariant(i, { price: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center justify-between sm:contents">
              <Toggle checked={v.isActive} onChange={(c) => setVariant(i, { isActive: c })} label="Live" />
              <button type="button" aria-label="Remove size" disabled={variants.length === 1}
                onClick={() => setVariants(variants.filter((_, k) => k !== i))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-25">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 3 — Photos */}
      <Section n={3} title="Photos" hint="JPG, PNG, WebP or AVIF · up to 5 MB each · up to 8 · portrait (4:5) looks best">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gold/60 bg-gold/5 px-4 py-7 text-center transition-colors hover:bg-gold/10">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 text-gold-deep" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L7 20" /></svg>
          <span className="text-sm text-ink">Click to choose photos</span>
          <span className="text-xs text-muted">{previews.length ? `${previews.length} selected — click to change` : 'The first photo becomes the main one'}</span>
          <input type="file" name="images" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only"
            onChange={(e) => setPreviews(Array.from(e.target.files || []).slice(0, 8).map((f) => ({ url: URL.createObjectURL(f), name: f.name })))} />
        </label>
        {previews.length > 0 && (
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {previews.map((p, i) => (
              <li key={p.url} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                {i === 0 && !product && <span className="absolute bottom-1 left-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[.55rem] uppercase tracking-[.12em] text-gold-deep">Main</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 4 — Story */}
      <Section n={4} title="Description & notes" hint="What customers read on the product page">
        <div className="space-y-4">
          <div>
            <label className={lbl} htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={4} maxLength={2000} placeholder="A short, inviting description of the scent…"
              className={`${field} mt-2 h-auto py-2.5`} defaultValue={product?.description} />
          </div>
          <div>
            <label className={lbl} htmlFor="notes">Scent notes <span className="normal-case tracking-normal">(separate with commas)</span></label>
            <input id="notes" name="notes" maxLength={400} className={`${field} mt-2`} defaultValue={product?.notes} placeholder="Saffron, Vanilla, Musk" />
          </div>
        </div>
      </Section>

      {/* 5 — Visibility */}
      <Section n={5} title="Visibility" hint="Where and how it appears in the shop">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <CheckCard name="isActive" defaultChecked={product?.isActive ?? true} title="Live in the shop" text="Customers can see and order it" />
          <CheckCard name="isFeatured" defaultChecked={product?.isFeatured ?? false} title="Featured" text="Shown first and used on the homepage" />
        </div>
        <div className="mt-4 max-w-[12rem]">
          <label className={lbl} htmlFor="sortOrder">Display order</label>
          <input id="sortOrder" name="sortOrder" type="number" min={0} className={`${field} mt-2`} defaultValue={product?.sortOrder ?? 0} />
          <p className="mt-1.5 text-[.7rem] text-muted">Lower numbers appear first.</p>
        </div>
      </Section>

      <FormFooter hint={product ? 'Changes go live as soon as you save.' : 'You can edit everything later.'}>
        <ModalCancel />
        <button disabled={pending}
          className="inline-flex h-11 items-center rounded-full bg-gold px-6 text-[.7rem] uppercase tracking-[.16em] text-ink transition-colors hover:bg-gold-light disabled:opacity-50">
          {pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </button>
      </FormFooter>
    </form>
  );
}

function Section({ n, title, hint, action, children }: { n: number; title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 font-serif text-sm text-gold-deep">{n}</span>
          <div>
            <h3 className="font-serif text-xl font-light leading-tight">{title}</h3>
            {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Radio styled as a selectable tile or pill. */
function Choice({ name, value, defaultChecked, pill, children }: { name: string; value: string; defaultChecked?: boolean; pill?: boolean; children: React.ReactNode }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className={`flex items-center justify-center border text-sm transition-colors peer-checked:border-gold peer-checked:bg-gold/15 peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-gold/50 ${pill ? 'h-9 rounded-full border-line px-4 text-xs' : 'h-11 rounded-lg border-line'} bg-white text-ink hover:border-gold`}>
        {children}
      </span>
    </label>
  );
}

/** Checkbox styled as a card with a title and a line of help. */
function CheckCard({ name, defaultChecked, title, text }: { name: string; defaultChecked: boolean; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3.5 transition-colors has-[:checked]:border-gold has-[:checked]:bg-gold/5">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-[#9C7C40]" />
      <span><span className="block text-sm text-ink">{title}</span><span className="block text-xs text-muted">{text}</span></span>
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="inline-flex shrink-0 items-center gap-2 px-1 text-xs text-muted">
      <span className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#1F7A4D]' : 'bg-line'}`}>
        <span className={`absolute left-0.5 top-0.5 block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
      <span className={checked ? 'text-[#1F7A4D]' : ''}>{label}</span>
    </button>
  );
}
