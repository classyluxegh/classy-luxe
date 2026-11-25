import Image from 'next/image';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { Badge, Flash } from '@/components/admin/ui';
import { SuggestSearch, type Suggestion } from '@/components/admin/SuggestSearch';
import { SubmitButton } from '@/components/admin/ConfirmButton';
import { toggleVariant, updateStock } from '../actions';

type Props = { searchParams: Promise<{ ok?: string; error?: string; filter?: string; q?: string }> };

interface Row {
  id: string; label: string; price_pesewas: number; track_inventory: boolean; stock: number; is_active: boolean;
  product: { id: string; name: string; variant_label: string | null; is_active: boolean; collection: string; product_images: { url: string; sort_order: number }[] } | null;
}
type Filter = 'all' | 'tracked' | 'low' | 'out' | 'untracked' | 'hidden';

export default async function InventoryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filter = (['all', 'tracked', 'low', 'out', 'untracked', 'hidden'].includes(sp.filter || '') ? sp.filter : 'all') as Filter;
  const q = (sp.q || '').trim().toLowerCase();
  const { supabase, role } = await requireAdmin();
  const manager = role !== 'staff';

  const [{ data: rows }, { data: settings }, { data: moves }] = await Promise.all([
    supabase.from('product_variants').select('id, label, price_pesewas, track_inventory, stock, is_active, product:products(id, name, variant_label, is_active, collection, product_images(url, sort_order))'),
    supabase.from('store_settings').select('low_stock_threshold').maybeSingle(),
    supabase.from('inventory_movements').select('id, change, reason, created_at, variant:product_variants(label, product:products(name))').order('created_at', { ascending: false }).limit(12)
  ]);
  const low = settings?.low_stock_threshold ?? 3;
  const all = ((rows || []) as unknown as Row[]).filter((r) => r.product);

  const isLow = (r: Row) => r.track_inventory && r.stock > 0 && r.stock <= low;
  const isOut = (r: Row) => r.track_inventory && r.stock === 0;
  const counts = {
    all: all.length,
    tracked: all.filter((r) => r.track_inventory).length,
    low: all.filter(isLow).length,
    out: all.filter(isOut).length,
    untracked: all.filter((r) => !r.track_inventory).length,
    hidden: all.filter((r) => !r.is_active).length
  };
  const unitsInStock = all.filter((r) => r.track_inventory).reduce((n, r) => n + r.stock, 0);

  let list = all;
  if (filter === 'tracked') list = list.filter((r) => r.track_inventory);
  if (filter === 'low') list = list.filter(isLow);
  if (filter === 'out') list = list.filter(isOut);
  if (filter === 'untracked') list = list.filter((r) => !r.track_inventory);
  if (filter === 'hidden') list = list.filter((r) => !r.is_active);
  if (q) list = list.filter((r) => r.product!.name.toLowerCase().includes(q));

  // group sizes under their product
  const groups = new Map<string, { product: NonNullable<Row['product']>; sizes: Row[] }>();
  for (const r of list) {
    const g = groups.get(r.product!.id) || { product: r.product!, sizes: [] };
    g.sizes.push(r);
    groups.set(r.product!.id, g);
  }
  const sorted = [...groups.values()].sort((a, b) => a.product.name.localeCompare(b.product.name));
  const here = `/admin/inventory?${new URLSearchParams({ ...(filter !== 'all' ? { filter } : {}), ...(q ? { q } : {}) })}`;
  const byProduct = new Map<string, { name: string; sizes: string[]; stock: number; tracked: boolean }>();
  for (const r of all) {
    const p = r.product!;
    const e = byProduct.get(p.id) || { name: p.name, sizes: [], stock: 0, tracked: false };
    if (r.label) e.sizes.push(r.label);
    if (r.track_inventory) { e.tracked = true; e.stock += r.stock; }
    byProduct.set(p.id, e);
  }
  const suggestions: Suggestion[] = [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({
    label: p.name,
    sub: `${p.sizes.length ? p.sizes.join(', ') : 'One size'} · ${p.tracked ? `${p.stock} in stock` : 'Always available'}`,
    href: `/admin/inventory?q=${encodeURIComponent(p.name)}`
  }));
  const tabHref = (f: Filter) => `/admin/inventory?${new URLSearchParams({ ...(f !== 'all' ? { filter: f } : {}), ...(q ? { q } : {}) })}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[.66rem] uppercase tracking-[.3em] text-gold-deep">Stock room</p>
          <h1 className="mt-1 font-serif text-4xl font-light text-ink">Inventory</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">Switch on tracking for a size to have stock reduce automatically with every order (and return if an order is cancelled).</p>
        </div>
        <SuggestSearch items={suggestions} defaultValue={sp.q || ''} placeholder="Search fragrances…" ariaLabel="Search fragrances"
          hidden={{ filter: filter !== 'all' ? filter : undefined }}
          clearHref={filter !== 'all' ? `/admin/inventory?filter=${filter}` : '/admin/inventory'} />
      </header>
      <Flash ok={sp.ok} error={sp.error} />

      {/* summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Units in stock" value={String(unitsInStock)} hint={`${counts.tracked} of ${counts.all} sizes tracked`} />
        <Stat label="Running low" value={String(counts.low)} hint={`At or below ${low} units`} tone={counts.low ? 'warn' : undefined} />
        <Stat label="Sold out" value={String(counts.out)} hint="Tracked sizes at 0" tone={counts.out ? 'bad' : undefined} />
        <Stat label="Unavailable" value={String(counts.hidden)} hint="Sizes hidden from the shop" />
      </section>

      {/* filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1.5" aria-label="Filter">
          {([['all', 'All'], ['tracked', 'Tracked'], ['low', 'Low'], ['out', 'Sold out'], ['untracked', 'Not tracked'], ['hidden', 'Unavailable']] as const).map(([f, l]) => (
            <Link key={f} href={tabHref(f)} className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${filter === f ? 'border-ink bg-ink text-ivory' : 'border-line bg-white text-text hover:border-ink'}`}>
              {l} <span className={filter === f ? 'text-gold-light' : 'text-muted'}>{counts[f]}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {sorted.length ? sorted.map(({ product: p, sizes }) => {
            const img = [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
            return (
              <article key={p.id} data-search={p.name.toLowerCase()} className="overflow-hidden rounded-xl border border-line bg-white">
                <header className="flex items-center gap-4 border-b border-line bg-ivory/60 px-5 py-3.5">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-beige">
                    {img ? <Image src={img.url} alt="" fill sizes="48px" className="object-cover" /> : <span className="grid h-full place-items-center font-serif italic text-gold-deep">CL</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-serif text-xl text-ink">{p.name}{p.variant_label && <span className="ml-2 text-sm text-muted">{p.variant_label}</span>}</h2>
                    <p className="text-xs capitalize text-muted">{p.collection} collection{!p.is_active && ' · product hidden'}</p>
                  </div>
                  {manager && <Link href={`/admin/products/${p.id}`} className="text-xs text-gold-deep hover:underline">Edit product →</Link>}
                </header>

                <ul className="divide-y divide-line">
                  {sizes.map((r) => {
                    const state = !r.is_active ? 'hidden' : !r.track_inventory ? 'untracked' : r.stock === 0 ? 'out' : r.stock <= low ? 'low' : 'ok';
                    const barMax = Math.max(20, r.stock);
                    return (
                      <li key={r.id} className={`grid items-center gap-4 px-5 py-4 lg:grid-cols-[150px_1fr_auto] ${!r.is_active ? 'opacity-60' : ''}`}>
                        <div>
                          <p className="font-medium text-ink">{r.label || 'One size'}</p>
                          <p className="text-xs text-muted">{money(r.price_pesewas)}</p>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                            <span>
                              {state === 'hidden' && <Badge>Unavailable</Badge>}
                              {state === 'untracked' && <Badge tone="good">Always available</Badge>}
                              {state === 'out' && <Badge tone="bad">Sold out</Badge>}
                              {state === 'low' && <Badge tone="warn">Running low</Badge>}
                              {state === 'ok' && <Badge tone="good">In stock</Badge>}
                            </span>
                            {r.track_inventory && <span className="tabular-nums text-muted"><strong className="font-serif text-lg font-normal text-ink">{r.stock}</strong> units</span>}
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-beige">
                            {r.track_inventory && (
                              <div className={`h-full rounded-full ${state === 'out' ? 'bg-danger' : state === 'low' ? 'bg-gold' : 'bg-whatsapp/70'}`} style={{ width: `${Math.max(r.stock ? 3 : 0, (r.stock / barMax) * 100)}%` }} />
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          {/* quick restock */}
                          <form action={updateStock} className="flex gap-1">
                            <input type="hidden" name="variantId" value={r.id} />
                            <input type="hidden" name="return" value={here} />
                            {[1, 5, 10].map((n) => (
                              <button key={n} name="quick" value={n} className="h-8 rounded-full border border-line px-2.5 text-xs text-text transition-colors hover:border-ink hover:bg-ink hover:text-ivory" title={`Add ${n} to stock`}>+{n}</button>
                            ))}
                          </form>
                          {/* set exact stock */}
                          <form action={updateStock} className="flex items-center gap-1.5 rounded-full border border-line bg-ivory/60 py-1 pl-3 pr-1">
                            <input type="hidden" name="variantId" value={r.id} />
                            <input type="hidden" name="return" value={here} />
                            <input type="hidden" name="reason" value="adjustment" />
                            <label className="flex items-center gap-1.5 text-[.7rem] text-muted" title="Track stock for this size">
                              <input type="checkbox" name="track" defaultChecked={r.track_inventory} className="accent-[#0F0D0B]" />Track
                            </label>
                            <input name="stock" type="number" min={0} max={100000} defaultValue={r.stock} aria-label={`Stock for ${p.name} ${r.label}`} className="h-7 w-16 rounded-full border border-line bg-white px-2 text-center text-sm outline-none focus:border-gold-deep" />
                            <SubmitButton className="h-7 rounded-full bg-ink px-3 text-[.66rem] uppercase tracking-[.12em] text-ivory disabled:opacity-50">Set</SubmitButton>
                          </form>
                          {manager && (
                            <form action={toggleVariant}>
                              <input type="hidden" name="variantId" value={r.id} />
                              <input type="hidden" name="active" value={String(!r.is_active)} />
                              <input type="hidden" name="return" value={here} />
                              <SubmitButton className="h-8 rounded-full px-2 text-xs text-muted underline-offset-4 hover:text-ink hover:underline">{r.is_active ? 'Mark unavailable' : 'Make available'}</SubmitButton>
                            </form>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          }) : (
            <p className="rounded-xl border border-line bg-white px-6 py-10 text-center text-sm text-muted">Nothing matches this filter.</p>
          )}
        </div>

        {/* recent stock changes */}
        <aside className="h-fit rounded-xl border border-line bg-white p-5 xl:sticky xl:top-6">
          <h2 className="mb-4 font-serif text-2xl text-ink">Recent changes</h2>
          {moves?.length ? (
            <ol className="space-y-3">
              {moves.map((m) => {
                const v = m.variant as unknown as { label: string; product: { name: string } | null } | null;
                return (
                  <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{v?.product?.name} <span className="text-muted">{v?.label}</span></span>
                      <span className="text-[.7rem] text-muted">
                        {{ order: 'Order placed', order_cancelled: 'Order cancelled', restock: 'Restock', adjustment: 'Adjustment' }[m.reason as string] || m.reason} ·{' '}
                        {new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' })}
                      </span>
                    </span>
                    <span className={`whitespace-nowrap font-medium tabular-nums ${m.change > 0 ? 'text-whatsapp' : 'text-danger'}`}>{m.change > 0 ? '+' : ''}{m.change}</span>
                  </li>
                );
              })}
            </ol>
          ) : <p className="text-sm text-muted">Stock changes will be listed here.</p>}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'warn' | 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-[.64rem] uppercase tracking-[.22em] text-muted">{label}</p>
      <p className={`mt-2 font-serif text-4xl leading-none ${tone === 'bad' ? 'text-danger' : tone === 'warn' ? 'text-gold-deep' : 'text-ink'}`}>{value}</p>
      <p className="mt-2 text-xs text-muted">{hint}</p>
    </div>
  );
}
