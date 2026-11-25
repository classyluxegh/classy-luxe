import { requireAdmin } from '@/lib/admin';
import { Flash, PageHead, btnOutline, input } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/ConfirmButton';
import { updateDeliveryRate } from '../actions';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function DeliveryPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin('manager');
  const { data: rates } = await supabase.from('delivery_rates').select('id, option, region, fee_pesewas');
  const order = { gctu: 0, accra: 1, region: 2 } as Record<string, number>;
  const list = [...(rates || [])].sort((a, b) => order[a.option] - order[b.option] || String(a.region).localeCompare(String(b.region)));

  return (
    <>
      <PageHead title="Delivery fees" sub="Leave a fee blank to keep 'confirmed on WhatsApp'. Online payment (Paystack) is only offered where a fee is set." />
      <Flash ok={ok} error={error} />
      <div className="max-w-2xl border border-line bg-white">
        {list.map((r) => (
          <form key={r.id} action={updateDeliveryRate} className="flex flex-wrap items-center gap-3 border-b border-line p-3 last:border-0">
            <input type="hidden" name="id" value={r.id} />
            <span className="min-w-48 flex-1 text-sm">{r.option === 'gctu' ? 'GCTU campus' : r.option === 'accra' ? 'Within Accra' : r.region}</span>
            <span className="text-sm text-muted">GH₵</span>
            <input name="fee" type="number" min={0} step="0.01" defaultValue={r.fee_pesewas == null ? '' : r.fee_pesewas / 100} placeholder="Confirm on WhatsApp" aria-label="Delivery fee in cedis" className={`${input} w-44`} />
            <SubmitButton className={`${btnOutline} h-9`}>Save</SubmitButton>
          </form>
        ))}
      </div>
    </>
  );
}
