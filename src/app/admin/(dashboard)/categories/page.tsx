import Image from 'next/image';
import { requireAdmin } from '@/lib/admin';
import { Badge, Flash, PageHead, btnDanger, btnDark, btnOutline, input } from '@/components/admin/ui';
import { ConfirmButton, SubmitButton } from '@/components/admin/ConfirmButton';
import { deleteCategory, saveCategory } from '../actions';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function CategoriesPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin('manager');
  const { data: cats } = await supabase.from('categories').select('id, slug, name, description, image_url, is_active, sort_order, products(count)').order('sort_order');
  const grid = 'grid items-end gap-3 md:grid-cols-[1.2fr_1fr_2fr_80px]';

  return (
    <>
      <PageHead title="Categories" sub="Shown as filters in the shop, the homepage and the footer. Assign products to a category from each product's page." />
      <Flash ok={ok} error={error} />
      <div className="space-y-3">
        {(cats || []).map((c) => {
          const count = (c.products as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <div key={c.id} className="border border-line bg-white p-4">
              <form action={saveCategory} className="space-y-3">
                <input type="hidden" name="id" value={c.id} />
                <div className={grid}>
                  <label className="text-xs text-muted">Name<input name="name" defaultValue={c.name} required className={`${input} mt-1`} /></label>
                  <label className="text-xs text-muted">Slug<input name="slug" defaultValue={c.slug} required className={`${input} mt-1`} /></label>
                  <label className="text-xs text-muted">Description<input name="description" defaultValue={c.description || ''} className={`${input} mt-1`} /></label>
                  <label className="text-xs text-muted">Order<input name="sortOrder" type="number" min={0} defaultValue={c.sort_order} className={`${input} mt-1`} /></label>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {c.image_url && <span className="relative h-12 w-12 overflow-hidden bg-beige"><Image src={c.image_url} alt="" fill sizes="48px" className="object-cover" /></span>}
                  <label className="text-muted">Image <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/avif" className="ml-1" /></label>
                  {c.image_url && <label className="flex items-center gap-1"><input type="checkbox" name="removeImage" />Remove image</label>}
                  <label className="flex items-center gap-1"><input type="checkbox" name="isActive" defaultChecked={c.is_active} />Active</label>
                  <span className="text-muted">{count} product{count === 1 ? '' : 's'}</span>
                  {!c.is_active && <Badge>Hidden</Badge>}
                  <SubmitButton className={`${btnOutline} ml-auto`}>Save</SubmitButton>
                </div>
              </form>
              <form action={deleteCategory} className="mt-2 text-right"><input type="hidden" name="id" value={c.id} /><ConfirmButton className={`${btnDanger} h-8`} message={`Delete the ${c.name} category?`}>Delete</ConfirmButton></form>
            </div>
          );
        })}
      </div>

      <h2 className="mb-3 mt-10 font-serif text-2xl">Add a category</h2>
      <form action={saveCategory} className="space-y-3 border border-line bg-white p-4">
        <div className={grid}>
          <label className="text-xs text-muted">Name<input name="name" required className={`${input} mt-1`} /></label>
          <label className="text-xs text-muted">Slug<input name="slug" required placeholder="e.g. gift-sets" className={`${input} mt-1`} /></label>
          <label className="text-xs text-muted">Description<input name="description" className={`${input} mt-1`} /></label>
          <label className="text-xs text-muted">Order<input name="sortOrder" type="number" min={0} defaultValue={cats?.length ?? 0} className={`${input} mt-1`} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="text-muted">Image <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/avif" className="ml-1" /></label>
          <label className="flex items-center gap-1"><input type="checkbox" name="isActive" defaultChecked />Active</label>
          <SubmitButton className={`${btnDark} ml-auto`}>Add category</SubmitButton>
        </div>
      </form>
    </>
  );
}
