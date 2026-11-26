import { requireAdmin } from '@/lib/admin';
import { Flash } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/ConfirmButton';
import { saveSettings } from '../actions';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

const SECTIONS = [
  { id: 'business', label: 'Business' },
  { id: 'contact', label: 'Contact & WhatsApp' },
  { id: 'social', label: 'Social media' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'store', label: 'Store' },
  { id: 'policies', label: 'Policies' }
] as const;

const fieldCls = 'mt-2 h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-gold-deep';
const labelCls = 'block text-[.64rem] uppercase tracking-[.18em] text-muted';

export default async function SettingsPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { supabase } = await requireAdmin('manager');
  const { data: s } = await supabase.from('store_settings').select('*').maybeSingle();
  if (!s) return <p className="text-danger">Store settings row is missing — run supabase/seed.sql.</p>;

  const updated = new Date(s.updated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra' });

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div>
        <p className="text-[.66rem] uppercase tracking-[.26em] text-gold-deep">Store</p>
        <h1 className="mt-1 font-serif text-[clamp(2rem,3.2vw,2.8rem)] font-light leading-none">Settings</h1>
        <p className="mt-2 text-sm text-muted">Changes appear on the website as soon as you save · last updated {updated}</p>
      </div>

      <Flash ok={ok} error={error} />

      <div className="grid gap-6 xl:grid-cols-[200px_1fr]">
        {/* ── Section jump links ─────────────────────── */}
        <nav aria-label="Settings sections" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:sticky xl:top-6 xl:mx-0 xl:block xl:h-fit xl:space-y-1 xl:overflow-visible xl:px-0">
          {SECTIONS.map((sec, i) => (
            <a key={sec.id} href={`#${sec.id}`}
              className="flex shrink-0 items-center gap-3 rounded-full border border-line bg-white px-4 py-2 text-xs text-ink transition-colors hover:border-gold hover:text-gold-deep xl:rounded-lg xl:border-transparent xl:bg-transparent xl:px-3 xl:text-sm xl:hover:bg-white">
              <span className="hidden font-serif text-sm italic text-gold-deep xl:inline">{String(i + 1).padStart(2, '0')}</span>{sec.label}
            </a>
          ))}
        </nav>

        <form action={saveSettings} className="min-w-0 space-y-6">
          <Section id="business" n={1} title="Business" hint="How your shop is named and where to find you">
            <Field name="businessName" label="Business name" value={s.business_name} />
            <Field name="tagline" label="Tagline" value={s.tagline} hint="Shown under the logo" />
            <Field name="addressLine1" label="Address line 1" value={s.address_line1} />
            <Field name="addressLine2" label="Address line 2" value={s.address_line2} />
            <Field name="businessHours" label="Business hours" value={s.business_hours} />
            <Field name="businessHoursShort" label="Business hours (short)" value={s.business_hours_short} hint="Used where space is tight" />
            <Area name="aboutText" label="Extra “Our story” paragraph" optional value={s.about_text} />
          </Section>

          <Section id="contact" n={2} title="Contact & WhatsApp ordering" hint="Where orders and enquiries go">
            <Field name="whatsappNumber" label="WhatsApp number for orders" value={s.whatsapp_number} hint="Digits only, starting with 233 — e.g. 233248751541" />
            <Field name="whatsappDisplay" label="WhatsApp number as shown" value={s.whatsapp_display} />
            <Field name="phoneNumber" label="Phone number for call links" value={s.phone_number} hint="e.g. +233539460710" />
            <Field name="phoneDisplay" label="Phone number as shown" value={s.phone_display} />
            <Field name="email" label="Email" optional type="email" value={s.email} />
          </Section>

          <Section id="social" n={3} title="Social media" hint="Links shown in the footer and contact page">
            <Field name="instagramUrl" label="Instagram link" value={s.instagram_url} hint="https://instagram.com/…" />
            <Field name="instagramHandle" label="Instagram handle" value={s.instagram_handle} />
            <Field name="snapchatHandle" label="Snapchat username" value={s.snapchat_handle} />
            <Field name="tiktokUrl" label="TikTok link" optional value={s.tiktok_url} />
            <Field name="facebookUrl" label="Facebook link" optional value={s.facebook_url} />
          </Section>

          <Section id="delivery" n={4} title="Delivery" hint={<>Text shown to customers · fees per area are under <a className="text-gold-deep underline-offset-4 hover:underline" href="/admin/delivery">Delivery fees</a></>}>
            <Area name="deliveryInfo" label="Nationwide delivery information" value={s.delivery_info} rows={3} />
            <Area name="studentDeliveryInfo" label="GCTU student delivery information" value={s.student_delivery_info} rows={3} />
          </Section>

          <Section id="store" n={5} title="Store" hint="Stock warnings and reviews">
            <Field name="lowStockThreshold" label="Low-stock warning at (units)" type="number" value={s.low_stock_threshold} hint="Shows “Only N left” in the shop and flags it on the dashboard" />
            <label className="flex cursor-pointer items-start gap-3 self-end rounded-lg border border-line p-3.5 transition-colors has-[:checked]:border-gold has-[:checked]:bg-gold/5">
              <input type="checkbox" name="reviewsEnabled" defaultChecked={s.reviews_enabled} className="mt-0.5 h-4 w-4 accent-[#9C7C40]" />
              <span><span className="block text-sm text-ink">Allow customer reviews</span><span className="block text-xs text-muted">Reviews still need your approval before they show</span></span>
            </label>
          </Section>

          <Section id="policies" n={6} title="Policies" hint="Leave a blank line between paragraphs · start a line with “## ” for a heading">
            <div className="space-y-3 md:col-span-2">
              <Policy name="privacyPolicy" label="Privacy policy" value={s.privacy_policy} />
              <Policy name="termsConditions" label="Terms & conditions" value={s.terms_conditions} />
              <Policy name="returnsPolicy" label="Returns & refunds" value={s.returns_policy} />
              <p className="text-xs text-muted">Write these in your own words — ideally checked by a lawyer. An empty policy shows “This page is being prepared”.</p>
            </div>
          </Section>

          {/* Save bar */}
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 px-5 py-3 shadow-[0_12px_30px_rgba(15,13,11,.08)] backdrop-blur">
            <p className="text-xs text-muted">Last updated {updated}</p>
            <SubmitButton className="inline-flex h-11 items-center rounded-full bg-gold px-7 text-[.7rem] uppercase tracking-[.16em] text-ink transition-colors hover:bg-gold-light disabled:opacity-50">Save settings</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ id, n, title, hint, children }: { id: string; n: number; title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 font-serif text-sm text-gold-deep">{n}</span>
        <div>
          <h2 className="font-serif text-2xl font-light leading-tight text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ name, label, hint, value, type = 'text', optional }: { name: string; label: string; hint?: string; value?: string | number | null; type?: string; optional?: boolean }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}{optional && <span className="normal-case tracking-normal"> (optional)</span>}</span>
      <input name={name} type={type} defaultValue={value ?? ''} className={fieldCls} />
      {hint && <span className="mt-1.5 block text-[.7rem] text-muted">{hint}</span>}
    </label>
  );
}

function Area({ name, label, value, rows = 4, optional }: { name: string; label: string; value?: string | null; rows?: number; optional?: boolean }) {
  return (
    <label className="block md:col-span-2">
      <span className={labelCls}>{label}{optional && <span className="normal-case tracking-normal"> (optional)</span>}</span>
      <textarea name={name} rows={rows} defaultValue={value ?? ''} className={`${fieldCls} h-auto py-2.5 leading-relaxed`} />
    </label>
  );
}

/** A policy editor that folds away so the page stays short. */
function Policy({ name, label, value }: { name: string; label: string; value?: string | null }) {
  const written = !!value?.trim();
  return (
    <details className="group rounded-lg border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
        <span className="text-sm text-ink">{label}</span>
        <span className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-0.5 text-[.62rem] uppercase tracking-[.12em] ${written ? 'bg-whatsapp/10 text-whatsapp' : 'bg-beige text-muted'}`}>{written ? 'Written' : 'Empty'}</span>
          <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="border-t border-line p-4">
        <textarea name={name} rows={10} defaultValue={value ?? ''} aria-label={label} className={`${fieldCls} mt-0 h-auto py-2.5 leading-relaxed`} />
      </div>
    </details>
  );
}
