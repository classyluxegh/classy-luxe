import { requireAdmin } from '@/lib/admin';
import { money } from '@/lib/money';
import { Flash } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/ConfirmButton';
import { setRegionFees, updateDeliveryRate } from '../actions';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };
interface Rate { id: string; option: 'gctu' | 'accra' | 'region'; region: string | null; fee_pesewas: number | null }

export default async function DeliveryPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin('manager');
  const { data } = await supabase.from('delivery_rates').select('id, option, region, fee_pesewas');
  const rates = (data || []) as Rate[];
  const gctu = rates.find((r) => r.option === 'gctu');
  const accra = rates.find((r) => r.option === 'accra');
  const regions = rates.filter((r) => r.option === 'region').sort((a, b) => String(a.region).localeCompare(String(b.region)));
  const regionsSet = regions.filter((r) => r.fee_pesewas !== null).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[.66rem] uppercase tracking-[.3em] text-gold-deep">Shipping</p>
        <h1 className="mt-1 font-serif text-4xl font-light text-ink">Delivery fees</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">Set what customers pay for delivery. These fees appear at checkout and are added to the order total.</p>
      </header>
      <Flash ok={ok} error={error} />

      {/* how it works */}
      <section className="grid gap-4 rounded-xl bg-ink p-6 text-ivory md:grid-cols-3">
        <Explain n="01" title="Fee set" text="Shown at checkout and added to the total. Online payment (Paystack) becomes available for that area." />
        <Explain n="02" title="Left blank" text="Checkout shows “Fee on WhatsApp” — you agree the fee with the customer and enter it on their order." />
        <Explain n="03" title="Set to 0" text="Delivery is free for that area, like GCTU campus." />
      </section>

      {/* Campus & city */}
      <section>
        <h2 className="mb-3 font-serif text-2xl text-ink">Campus &amp; city</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {gctu && <BigRate rate={gctu} title="GCTU campus" note="Students around the GCTU campus area" />}
          {accra && <BigRate rate={accra} title="Within Accra" note="Anywhere in Accra" />}
        </div>
      </section>

      {/* Regions */}
      <section className="rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line p-5">
          <div>
            <h2 className="font-serif text-2xl text-ink">Regions</h2>
            <p className="mt-1 text-sm text-muted">{regionsSet} of {regions.length} regions have a fee · the rest are confirmed on WhatsApp</p>
            <div className="mt-3 h-1.5 w-64 max-w-full overflow-hidden rounded-full bg-beige"><div className="h-full rounded-full bg-gold" style={{ width: `${regions.length ? (regionsSet / regions.length) * 100 : 0}%` }} /></div>
          </div>

          {/* bulk */}
          <form action={setRegionFees} className="flex flex-wrap items-center gap-2 rounded-full border border-line bg-ivory/60 py-1.5 pl-4 pr-1.5 text-sm">
            <span className="text-muted">Set</span>
            <span className="flex items-center gap-1 rounded-full border border-line bg-white px-3">
              <span className="text-xs text-muted">GH₵</span>
              <input name="fee" type="number" min={0} step="0.01" placeholder="e.g. 50" aria-label="Fee in cedis" className="h-8 w-20 bg-transparent text-sm outline-none" />
            </span>
            <span className="text-muted">for</span>
            <select name="scope" defaultValue="empty" aria-label="Which regions" className="h-8 rounded-full border border-line bg-white px-3 text-sm outline-none">
              <option value="empty">regions without a fee</option>
              <option value="all">all regions</option>
            </select>
            <SubmitButton className="h-8 rounded-full bg-ink px-4 text-[.66rem] uppercase tracking-[.14em] text-ivory disabled:opacity-50">Apply</SubmitButton>
          </form>
        </div>

        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {regions.map((r) => (
            <form key={r.id} action={updateDeliveryRate} className="flex flex-col gap-3 bg-white p-5">
              <input type="hidden" name="id" value={r.id} />
              <div className="flex items-start justify-between gap-2">
                <span className="font-serif text-lg leading-tight text-ink">{r.region}</span>
                <Status fee={r.fee_pesewas} />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex flex-1 items-center gap-1 rounded-full border border-line px-3 focus-within:border-gold-deep">
                  <span className="text-xs text-muted">GH₵</span>
                  <input name="fee" type="number" min={0} step="0.01" defaultValue={r.fee_pesewas == null ? '' : r.fee_pesewas / 100} placeholder="On WhatsApp" aria-label={`Delivery fee for ${r.region} in cedis`} className="h-9 w-full min-w-0 bg-transparent text-sm outline-none" />
                </span>
                <SubmitButton className="h-9 rounded-full border border-line px-3.5 text-[.66rem] uppercase tracking-[.12em] text-ink transition-colors hover:border-ink hover:bg-ink hover:text-ivory disabled:opacity-50">Save</SubmitButton>
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

function Explain({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="flex gap-4">
      <span className="font-serif text-2xl italic text-gold">{n}</span>
      <div>
        <p className="font-serif text-lg">{title}</p>
        <p className="mt-1 text-sm text-ivory/60">{text}</p>
      </div>
    </div>
  );
}

function Status({ fee }: { fee: number | null }) {
  if (fee === null) return <span className="whitespace-nowrap rounded-full bg-beige px-2.5 py-0.5 text-[.64rem] uppercase tracking-[.1em] text-muted">On WhatsApp</span>;
  if (fee === 0) return <span className="whitespace-nowrap rounded-full bg-whatsapp/10 px-2.5 py-0.5 text-[.64rem] uppercase tracking-[.1em] text-whatsapp">Free</span>;
  return <span className="whitespace-nowrap rounded-full bg-gold/20 px-2.5 py-0.5 text-[.64rem] uppercase tracking-[.1em] text-gold-deep">{money(fee)}</span>;
}

function BigRate({ rate, title, note }: { rate: Rate; title: string; note: string }) {
  return (
    <form action={updateDeliveryRate} className="flex flex-col justify-between gap-5 rounded-xl border border-line bg-white p-6">
      <input type="hidden" name="id" value={rate.id} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl text-ink">{title}</h3>
          <p className="text-sm text-muted">{note}</p>
        </div>
        <Status fee={rate.fee_pesewas} />
      </div>
      <div>
        <p className="mb-2 font-serif text-4xl text-ink">{rate.fee_pesewas === null ? <span className="text-2xl text-muted">Confirmed on WhatsApp</span> : rate.fee_pesewas === 0 ? 'Free' : money(rate.fee_pesewas)}</p>
        <div className="flex items-center gap-2">
          <span className="flex flex-1 items-center gap-1 rounded-full border border-line px-4 focus-within:border-gold-deep">
            <span className="text-xs text-muted">GH₵</span>
            <input name="fee" type="number" min={0} step="0.01" defaultValue={rate.fee_pesewas == null ? '' : rate.fee_pesewas / 100} placeholder="Leave blank for WhatsApp" aria-label={`Delivery fee for ${title} in cedis`} className="h-10 w-full min-w-0 bg-transparent text-sm outline-none" />
          </span>
          <SubmitButton className="h-10 rounded-full bg-ink px-5 text-[.68rem] uppercase tracking-[.14em] text-ivory transition-colors hover:bg-charcoal-2 disabled:opacity-50">Save</SubmitButton>
        </div>
      </div>
    </form>
  );
}
