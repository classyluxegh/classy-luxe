import Image from 'next/image';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { Badge, Flash, input, btnAdd, PlusIcon } from '@/components/admin/ui';
import { ConfirmButton, SubmitButton } from '@/components/admin/ConfirmButton';
import { deleteCategory, saveCategory } from '../actions';
import { FormFooter, Modal, ModalCancel } from '@/components/admin/Modal';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

interface Cat { id: string; slug: string; name: string; description: string | null; image_url: string | null; is_active: boolean; sort_order: number; products: { count: number }[] }

export default async function CategoriesPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin('manager');
  const { data } = await supabase.from('categories').select('id, slug, name, description, image_url, is_active, sort_order, products(count)').order('sort_order');
  const cats = (data || []) as unknown as Cat[];
  const live = cats.filter((c) => c.is_active).length;
  const withProducts = cats.filter((c) => (c.products?.[0]?.count ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[.66rem] uppercase tracking-[.3em] text-gold-deep">Catalogue</p>
          <h1 className="mt-1 font-serif text-4xl font-light text-ink">Categories</h1>
          <p className="mt-1 text-sm text-muted">{cats.length} categories · {live} shown in the shop · {withProducts} with products</p>
        </div>
        <Modal eyebrow="Catalogue" title="Add a new category" subtitle="Group your fragrances — e.g. Gift Sets, Unisex, Travel Sizes." openParam="category"
          triggerClassName={btnAdd}
          trigger={<><PlusIcon />Add category</>}>
          <CategoryForm submitLabel="Add category" nextOrder={cats.length} />
        </Modal>
      </header>
      <Flash ok={ok} error={error} />


      {/* gallery */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cats.map((c) => {
          const count = c.products?.[0]?.count ?? 0;
          return (
            <article key={c.id} className={`group overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-[0_16px_40px_rgba(15,13,11,.07)] ${c.is_active ? 'border-line' : 'border-dashed border-line'}`}>
              <div className="relative aspect-[16/9] overflow-hidden bg-ink">
                {c.image_url ? (
                  <Image src={c.image_url} alt="" fill sizes="(max-width: 1280px) 50vw, 33vw" className={`object-cover transition-transform duration-700 group-hover:scale-105 ${c.is_active ? '' : 'grayscale'}`} />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(70%_80%_at_50%_30%,#2A241E,#0F0D0B)]">
                    <span className="font-serif text-5xl italic text-gold/80">{c.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  </div>
                )}
                <span className="absolute inset-0 bg-linear-to-t from-ink/70 via-transparent to-transparent" />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <span className="rounded-full bg-ivory/90 px-2.5 py-0.5 text-[.66rem] tabular-nums text-ink">#{c.sort_order}</span>
                  {!c.is_active && <span className="rounded-full bg-ink/80 px-2.5 py-0.5 text-[.66rem] uppercase tracking-[.12em] text-ivory">Hidden</span>}
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-ivory">
                  <h2 className="font-serif text-2xl leading-tight">{c.name}</h2>
                  <span className="whitespace-nowrap text-xs text-ivory/80">{count} product{count === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="p-5">
                <p className="min-h-[2.5rem] text-sm text-muted">{c.description || <span className="italic text-muted-light">No description yet</span>}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone={c.is_active ? 'good' : 'neutral'}>{c.is_active ? 'Shown in shop' : 'Hidden'}</Badge>
                  <span className="text-muted-light">/{c.slug}</span>
                  {c.is_active && <Link href={`/shop?category=${c.slug}`} target="_blank" className="ml-auto text-gold-deep hover:underline">View in shop ↗</Link>}
                </div>

                <details className="mt-4 border-t border-line pt-3">
                  <summary className="cursor-pointer list-none text-xs uppercase tracking-[.16em] text-ink hover:text-gold-deep [&::-webkit-details-marker]:hidden">Edit category ▾</summary>
                  <div className="mt-4">
                    <CategoryForm cat={c} submitLabel="Save changes" />
                    <form action={deleteCategory} className="mt-3 border-t border-line pt-3">
                      <input type="hidden" name="id" value={c.id} />
                      {count > 0 ? (
                        <p className="text-xs text-muted">To delete this category, first move or delete its {count} product{count === 1 ? '' : 's'}.</p>
                      ) : (
                        <ConfirmButton className="text-xs text-danger hover:underline" message={`Delete the ${c.name} category?`}>Delete category</ConfirmButton>
                      )}
                    </form>
                  </div>
                </details>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function CategoryForm({ cat, submitLabel, nextOrder }: { cat?: Cat; submitLabel: string; nextOrder?: number }) {
  const label = 'block text-[.64rem] uppercase tracking-[.16em] text-muted';
  return (
    <form action={saveCategory} className="grid gap-4 sm:grid-cols-2">
      {cat && <input type="hidden" name="id" value={cat.id} />}
      <label className={label}>Name<input name="name" defaultValue={cat?.name} required placeholder="e.g. Gift Sets" className={`${input} mt-2 h-11 rounded-lg normal-case tracking-normal`} /></label>
      <label className={label}>Web address (slug)<input name="slug" defaultValue={cat?.slug} required placeholder="e.g. gift-sets" className={`${input} mt-2 h-11 rounded-lg normal-case tracking-normal`} /></label>
      <label className={`${label} sm:col-span-2`}>Description<input name="description" defaultValue={cat?.description || ''} placeholder="One short line shown in the shop" className={`${input} mt-2 h-11 rounded-lg normal-case tracking-normal`} /></label>
      <label className={label}>Display order<input name="sortOrder" type="number" min={0} defaultValue={cat?.sort_order ?? nextOrder ?? 0} className={`${input} mt-2 h-11 rounded-lg normal-case tracking-normal`} /></label>
      <label className={label}>
        Image <span className="normal-case tracking-normal">(JPG, PNG, WebP · max 5 MB)</span>
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-2 block w-full text-xs normal-case tracking-normal text-text file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:text-ivory" />
      </label>
      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={cat ? cat.is_active : true} className="accent-[#0F0D0B]" />Show in the shop</label>
        {cat?.image_url && <label className="flex items-center gap-2 text-muted"><input type="checkbox" name="removeImage" className="accent-[#0F0D0B]" />Remove image</label>}
      </div>
      <div className="sm:col-span-2">
        <FormFooter hint={cat ? undefined : 'You can add products to it afterwards.'}>
          <ModalCancel />
          <SubmitButton className="inline-flex h-11 items-center rounded-full bg-gold px-6 text-[.7rem] uppercase tracking-[.16em] text-ink transition-colors hover:bg-gold-light disabled:opacity-50">{submitLabel}</SubmitButton>
        </FormFooter>
      </div>
    </form>
  );
}
