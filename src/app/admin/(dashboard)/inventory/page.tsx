import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { Badge, Flash, PageHead, btnOutline, input } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/ConfirmButton';
import { toggleVariant, updateStock } from '../actions';

type Props = { searchParams: Promise<{ ok?: string; error?: string; filter?: string }> };

export default async function InventoryPage({ searchParams }: Props) {
  const { ok, error, filter } = await searchParams;
  const { supabase, role } = await requireAdmin();
  const manager = role !== 'staff';
  const { data: rows } = await supabase
    .from('product_variants')
    .select('id, label, price_pesewas, track_inventory, stock, is_active, product:products(id, name, variant_label, is_active, collection)')
    .order('stock');
  type Row = NonNullable<typeof rows>[number] & { product: { id: string; name: string; variant_label: string | null; is_active: boolean; collection: string } };
  let list = (rows || []) as unknown as Row[];
  if (filter === 'low') list = list.filter((r) => r.track_inventory && r.stock <= 3);
  if (filter === 'out') list = list.filter((r) => r.track_inventory && r.stock === 0);
  list.sort((a, b) => a.product.name.localeCompare(b.product.name));

  return (
    <>
      <PageHead title="Inventory" sub="Switch on tracking to have stock reduced automatically when orders are placed (and returned if cancelled)." />
      <Flash ok={ok} error={error} />
      <div className="mb-5 flex gap-2 text-sm">
        {[['', 'All'], ['low', 'Low stock (≤3)'], ['out', 'Out of stock']].map(([v, l]) => (
          <Link key={v} href={v ? `/admin/inventory?filter=${v}` : '/admin/inventory'} className={`px-3 py-1.5 border ${(filter || '') === v ? 'border-ink bg-ink text-ivory' : 'border-line'}`}>{l}</Link>
        ))}
      </div>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-ivory text-left text-[.68rem] uppercase tracking-[.14em] text-muted">
            <tr><th className="p-3">Product</th><th className="p-3">Size</th><th className="p-3">Price</th><th className="p-3">Availability</th><th className="p-3">Stock</th><th className="p-3">On sale</th></tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-line align-middle">
                <td className="p-3"><Link className="hover:text-gold-deep" href={`/admin/products/${r.product.id}`}>{r.product.name}</Link>{!r.product.is_active && <span className="ml-2"><Badge>Product hidden</Badge></span>}</td>
                <td className="p-3">{r.label || '—'}</td>
                <td className="p-3">{money(r.price_pesewas)}</td>
                <td className="p-3">{!r.track_inventory ? <Badge tone="good">Always available</Badge> : r.stock === 0 ? <Badge tone="bad">Out of stock</Badge> : r.stock <= 3 ? <Badge tone="warn">Low</Badge> : <Badge tone="good">In stock</Badge>}</td>
                <td className="p-3">
                  <form action={updateStock} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="variantId" value={r.id} />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="track" defaultChecked={r.track_inventory} />Track</label>
                    <input name="stock" type="number" min={0} max={100000} defaultValue={r.stock} aria-label="Stock quantity" className={`${input} w-20`} />
                    <select name="reason" aria-label="Reason" className={`${input} w-28`}><option value="adjustment">Adjust</option><option value="restock">Restock</option></select>
                    <SubmitButton className={`${btnOutline} h-9`}>Save</SubmitButton>
                  </form>
                </td>
                <td className="p-3">
                  {manager ? <form action={toggleVariant}>
                    <input type="hidden" name="variantId" value={r.id} />
                    <input type="hidden" name="active" value={String(!r.is_active)} />
                    <SubmitButton className="text-xs underline">{r.is_active ? 'Mark unavailable' : 'Make available'}</SubmitButton>
                  </form> : <span className="text-xs text-muted">{r.is_active ? 'Visible' : 'Hidden'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-6 text-sm text-muted">Nothing here.</p>}
      </div>
    </>
  );
}
