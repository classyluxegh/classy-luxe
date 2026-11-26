import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { Flash } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/ConfirmButton';
import { setRegionFees, updateDeliveryRate } from '../actions';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };
interface Rate { id: string; option: 'gctu' | 'accra' | 'region'; region: string | null; fee_pesewas: number | null }

const feeText = (fee: number | null) => (fee === null ? 'On WhatsApp' : fee === 0 ? 'Free' : money(fee));

export default async function DeliveryPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin('manager');
  const { data } = await supabase.from('delivery_rates').select('id, option, region, fee_pesewas');
  const rates = (data || []) as Rate[];
  const gctu = rates.find((r) => r.option === 'gctu');
  const accra = rates.find((r) => r.option === 'accra');
  const regions = rates.filter((r) => r.option === 'region').sort((a, b) => String(a.region).localeCompare(String(b.region)));
  const regionsSet = regions.filter((r) => r.fee_pesewas !== null).length;
  const onWhatsApp = regions.length - regionsSet;

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div>
        <p className="text-[.66rem] uppercase tracking-[.26em] text-gold-deep">Shipping</p>
        <h1 className="mt-1 font-serif text-[clamp(2rem,3.2vw,2.8rem)] font-light leading-none">Delivery fees</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">What customers pay for delivery. Fees show at checkout and are added to the order total.</p>
      </div>

      <Flash ok={ok} error={error} />

      {/* ── Summary ──────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="GCTU campus" value={gctu ? feeText(gctu.fee_pesewas) : '—'} hint="Around the GCTU campus" dark />
        <Stat label="Within Accra" value={accra ? feeText(accra.fee_pesewas) : '—'} hint="Anywhere in Accra" />
        <Stat label="Regions with a fee" value={`${regionsSet} / ${regions.length}`} hint="Shown at checkout" />
        <Stat label="Agreed on WhatsApp" value={String(onWhatsApp)} hint="Regions with no fee set yet" />
      </section>

      {/* ── Campus & city ───────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        {gctu && <AreaCard rate={gctu} title="GCTU campus" note="Students around the GCTU campus area" />}
        {accra && <AreaCard rate={accra} title="Within Accra" note="Anywhere in Accra" />}
      </section>

      {/* ── Regions ──────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line p-5 sm:p-6">
          <div>
            <h2 className="font-serif text-2xl font-light text-ink">Regions</h2>
            <p className="mt-1 text-sm text-muted">{regionsSet} of {regions.length} have a fee · the rest are agreed on WhatsApp</p>
            <div className="mt-3 h-1.5 w-56 max-w-full overflow-hidden rounded-full bg-beige">
              <div className="h-full rounded-full bg-gold" style={{ width: `${regions.length ? (regionsSet / regions.length) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Set many at once */}
          <form action={setRegionFees} className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
            <label className="text-[.62rem] uppercase tracking-[.18em] text-muted">Set a fee of
              <span className="mt-1.5 flex h-10 w-32 items-center gap-1 rounded-full border border-line bg-white px-3 focus-within:border-gold-deep">
                <span className="text-xs normal-case tracking-normal text-muted">GH₵</span>
                <input name="fee" type="number" min={0} step="0.01" placeholder="50" aria-label="Fee in cedis" className="h-full w-full min-w-0 bg-transparent text-sm normal-case tracking-normal text-ink outline-none" />
              </span>
            </label>
            <label className="text-[.62rem] uppercase tracking-[.18em] text-muted">For
              <select name="scope" defaultValue="empty" aria-label="Which regions" className="mt-1.5 block h-10 rounded-full border border-line bg-white px-3 text-sm normal-case tracking-normal text-ink outline-none focus:border-gold-deep">
                <option value="empty">Regions without a fee</option>
                <option value="all">All regions</option>
              </select>
            </label>
            <SubmitButton className="h-10 rounded-full bg-gold px-5 text-[.68rem] uppercase tracking-[.14em] text-ink transition-colors hover:bg-gold-light disabled:opacity-50">Apply</SubmitButton>
          </form>
        </div>

        <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-4 border-b border-line bg-ivory px-6 py-3 text-[.62rem] uppercase tracking-[.18em] text-muted md:grid">
          <span>Region</span><span>Customers see</span><span>Fee (GH₵)</span>
        </div>
        <ul className="divide-y divide-line">
          {regions.map((r) => (
            <li key={r.id}>
              <form action={updateDeliveryRate} className="grid items-center gap-x-4 gap-y-3 px-5 py-3.5 sm:px-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
                <input type="hidden" name="id" value={r.id} />
                <div className="flex items-center justify-between gap-3 md:block">
                  <p className="text-sm text-ink">{r.region}</p>
                  <span className="md:hidden"><Status fee={r.fee_pesewas} /></span>
                </div>
                <span className="hidden md:block"><Status fee={r.fee_pesewas} /></span>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 flex-1 items-center gap-1 rounded-full border border-line px-3.5 focus-within:border-gold-deep">
                    <span className="text-xs text-muted">GH₵</span>
                    <input name="fee" type="number" min={0} step="0.01" defaultValue={r.fee_pesewas == null ? '' : r.fee_pesewas / 100} placeholder="Blank = on WhatsApp"
                      aria-label={`Delivery fee for ${r.region} in cedis`} className="h-full w-full min-w-0 bg-transparent text-sm outline-none" />
                  </span>
                  <SubmitButton className="h-10 rounded-full border border-line px-4 text-[.66rem] uppercase tracking-[.12em] text-ink transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50">Save</SubmitButton>
                </div>
              </form>
            </li>
          ))}
        </ul>
        {!regions.length && <p className="p-10 text-center text-sm text-muted">No regions set up yet.</p>}
      </section>

      <p className="text-xs text-muted">Leave a fee blank to agree it with the customer on WhatsApp · enter 0 to make delivery free.</p>
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

function Status({ fee }: { fee: number | null }) {
  if (fee === null) return <span className="inline-block whitespace-nowrap rounded-full bg-beige px-2.5 py-0.5 text-[.64rem] uppercase tracking-[.1em] text-muted">On WhatsApp</span>;
  if (fee === 0) return <span className="inline-block whitespace-nowrap rounded-full bg-whatsapp/10 px-2.5 py-0.5 text-[.64rem] uppercase tracking-[.1em] text-whatsapp">Free</span>;
  return <span className="inline-block whitespace-nowrap rounded-full bg-gold/20 px-2.5 py-0.5 text-[.64rem] uppercase tracking-[.1em] text-gold-deep">{money(fee)}</span>;
}

function AreaCard({ rate, title, note }: { rate: Rate; title: string; note: string }) {
  return (
    <form action={updateDeliveryRate} className="flex flex-col gap-5 rounded-xl border border-line bg-white p-6">
      <input type="hidden" name="id" value={rate.id} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-light text-ink">{title}</h2>
          <p className="text-sm text-muted">{note}</p>
        </div>
        <Status fee={rate.fee_pesewas} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-11 min-w-[10rem] flex-1 items-center gap-1 rounded-full border border-line px-4 focus-within:border-gold-deep">
          <span className="text-xs text-muted">GH₵</span>
          <input name="fee" type="number" min={0} step="0.01" defaultValue={rate.fee_pesewas == null ? '' : rate.fee_pesewas / 100} placeholder="Blank = on WhatsApp"
            aria-label={`Delivery fee for ${title} in cedis`} className="h-full w-full min-w-0 bg-transparent text-sm outline-none" />
        </span>
        <SubmitButton className="h-11 rounded-full bg-gold px-6 text-[.68rem] uppercase tracking-[.14em] text-ink transition-colors hover:bg-gold-light disabled:opacity-50">Save</SubmitButton>
      </div>
    </form>
  );
}
