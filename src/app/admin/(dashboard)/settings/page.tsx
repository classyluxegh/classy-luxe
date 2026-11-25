import { requireAdmin } from '@/lib/admin';
import { Flash, PageHead, btnDark, input } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/ConfirmButton';
import { saveSettings } from '../actions';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin('manager');
  const { data: s } = await supabase.from('store_settings').select('*').maybeSingle();
  if (!s) return <p className="text-danger">Store settings row is missing — run supabase/seed.sql.</p>;

  const F = ({ name, label, hint, value, type = 'text', wide }: { name: string; label: string; hint?: string; value?: string | number | null; type?: string; wide?: boolean }) => (
    <label className={`text-xs text-muted ${wide ? 'md:col-span-2' : ''}`}>
      {label}
      <input name={name} type={type} defaultValue={value ?? ''} className={`${input} mt-1`} />
      {hint && <span className="mt-1 block text-[.7rem] text-muted-light">{hint}</span>}
    </label>
  );
  const T = ({ name, label, hint, value, rows = 4 }: { name: string; label: string; hint?: string; value?: string | null; rows?: number }) => (
    <label className="text-xs text-muted md:col-span-2">
      {label}
      <textarea name={name} rows={rows} defaultValue={value ?? ''} className={`${input} mt-1 h-auto py-2 leading-relaxed`} />
      {hint && <span className="mt-1 block text-[.7rem] text-muted-light">{hint}</span>}
    </label>
  );
  const section = 'grid gap-4 border border-line bg-white p-6 md:grid-cols-2';
  const h = 'font-serif text-2xl text-ink md:col-span-2';

  return (
    <>
      <PageHead title="Settings" sub={`Changes appear on the website straight away. Last updated ${new Date(s.updated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra' })}.`} />
      <Flash ok={ok} error={error} />
      <form action={saveSettings} className="max-w-4xl space-y-6">
        <section className={section}>
          <h2 className={h}>Business</h2>
          <F name="businessName" label="Business name" value={s.business_name} />
          <F name="tagline" label="Tagline" value={s.tagline} />
          <F name="addressLine1" label="Address line 1" value={s.address_line1} />
          <F name="addressLine2" label="Address line 2" value={s.address_line2} />
          <F name="businessHours" label="Business hours" value={s.business_hours} />
          <F name="businessHoursShort" label="Business hours (short)" value={s.business_hours_short} />
          <T name="aboutText" label="Extra 'Our story' paragraph (optional)" value={s.about_text} />
        </section>

        <section className={section}>
          <h2 className={h}>Contact &amp; WhatsApp ordering</h2>
          <F name="whatsappNumber" label="WhatsApp number (orders are sent here)" value={s.whatsapp_number} hint="International format, digits only, no leading 0 — e.g. 233248751541" />
          <F name="whatsappDisplay" label="WhatsApp number as shown" value={s.whatsapp_display} />
          <F name="phoneNumber" label="Phone number (for call links)" value={s.phone_number} hint="e.g. +233539460710" />
          <F name="phoneDisplay" label="Phone number as shown" value={s.phone_display} />
          <F name="email" label="Email (optional)" type="email" value={s.email} />
        </section>

        <section className={section}>
          <h2 className={h}>Social media</h2>
          <F name="instagramUrl" label="Instagram link" value={s.instagram_url} hint="https://instagram.com/…" />
          <F name="instagramHandle" label="Instagram handle" value={s.instagram_handle} />
          <F name="snapchatHandle" label="Snapchat username" value={s.snapchat_handle} />
          <F name="tiktokUrl" label="TikTok link (optional)" value={s.tiktok_url} />
          <F name="facebookUrl" label="Facebook link (optional)" value={s.facebook_url} />
        </section>

        <section className={section}>
          <h2 className={h}>Delivery</h2>
          <T name="deliveryInfo" label="Nationwide delivery information" value={s.delivery_info} rows={3} />
          <T name="studentDeliveryInfo" label="GCTU student delivery information" value={s.student_delivery_info} rows={3} />
          <p className="text-xs text-muted md:col-span-2">Delivery fees per area are set under <a className="underline" href="/admin/delivery">Delivery fees</a>.</p>
        </section>

        <section className={section}>
          <h2 className={h}>Store</h2>
          <F name="lowStockThreshold" label="Low-stock warning at (units)" type="number" value={s.low_stock_threshold} hint="Shows 'Only N left' in the shop and flags it on the dashboard" />
          <label className="flex items-center gap-3 self-center text-sm"><input type="checkbox" name="reviewsEnabled" defaultChecked={s.reviews_enabled} className="h-4 w-4 accent-ink" />Allow customers to submit reviews</label>
        </section>

        <section className={section}>
          <h2 className={h}>Policies</h2>
          <p className="text-xs text-muted md:col-span-2">Write these in your own words (ideally checked by a lawyer). Leave a blank line between paragraphs; start a line with &quot;## &quot; for a heading. Empty policies show &quot;This page is being prepared&quot;.</p>
          <T name="privacyPolicy" label="Privacy policy" value={s.privacy_policy} rows={8} />
          <T name="termsConditions" label="Terms & conditions" value={s.terms_conditions} rows={8} />
          <T name="returnsPolicy" label="Returns & refunds" value={s.returns_policy} rows={8} />
        </section>

        <div className="sticky bottom-0 -mx-1 bg-ivory-2/95 px-1 py-4 backdrop-blur"><SubmitButton className={btnDark}>Save settings</SubmitButton></div>
      </form>
    </>
  );
}
