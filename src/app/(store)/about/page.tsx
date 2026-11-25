import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalog } from '@/lib/catalog';
import { pickImage } from '@/lib/pick-image';
import { money } from '@/lib/money';
import { minPrice } from '@/lib/types';
import type { Collection } from '@/lib/types';
import { ProductImage } from '@/components/store/ProductImage';
import { ShopLink } from '@/components/store/ShopLink';
import { WaLink } from '@/components/store/WaLink';
import { WhatsAppIcon } from '@/components/store/Icons';
import { CountUp } from '@/components/store/CountUp';
import { StepsBento } from '@/components/store/StepsBento';

export const metadata: Metadata = {
  title: 'About Us — Our Story',
  description:
    'The story of Classy Luxe: authentic luxury fragrances from Alhaji Lapaz, Accra, made accessible to every Ghanaian — Student and General collections, nationwide delivery and free GCTU campus delivery.',
  alternates: { canonical: '/about' }
};

const VALUES = [
  { title: 'Authenticity', text: '100% genuine products from trusted premium suppliers.', detail: 'Every bottle we sell is the real thing. Trust is the foundation of everything we do.' },
  { title: 'Accessibility', text: 'Luxury at prices every Ghanaian can embrace.', detail: 'From our Student Collection to statement 100ml bottles, there is a signature scent for every budget.' },
  { title: 'Community', text: 'Proudly Ghanaian, serving our people with pride.', detail: 'Born in Alhaji Lapaz and delivering to all 16 regions — from campus halls to boardrooms.' },
  { title: 'Excellence', text: 'Every touchpoint reflects our uncompromising standard.', detail: 'From the first WhatsApp message to the moment your order arrives, care goes into every detail.' }
];

const CHAPTERS = [
  { n: '01', title: 'The belief', text: 'Classy Luxe was born from one simple, powerful belief: every person deserves to smell extraordinary. Founded in Accra, Ghana, our brand was created to bring world-class luxury fragrances within reach of every Ghanaian.' },
  { n: '02', title: 'The gap', text: 'Our founder — a passionate fragrance enthusiast from Alhaji Lapaz — saw a gap: premium scents that were authentic, accessible, and delivered with genuine care. From that vision, Classy Luxe was born.' },
  { n: '03', title: 'Today', text: 'Today we carry Luxury Perfumes, Body Splash, Oil Perfumes, Deodorants, Diffusers, Hand Cream, Mini Wipes, and Petal Paper Soap — a complete range for those who believe in smelling extraordinary every day.' }
];

export default async function AboutPage() {
  const { products, categories, settings: S } = await getCatalog();
  const img = (slug: string, i: number) => pickImage(products, slug, i);
  const collection = (c: Collection) => {
    const list = products.filter((p) => p.collection === c);
    return { n: list.length, from: list.length ? Math.min(...list.map(minPrice)) : null };
  };
  const student = collection('student');
  const general = collection('general');
  const mapUrl = S.addressLine1 ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${S.addressLine1}, Ghana`)}` : null;

  return (
    <>
      {/* ── HERO: centred editorial title over an arched triptych ── */}
      <section className="relative overflow-hidden bg-ink text-ivory" aria-labelledby="aboutTitle">
        <div className="hero-bg" aria-hidden="true" />
        <div className="container relative pt-[clamp(130px,15vw,190px)] text-center">
          <p className="eyebrow eyebrow-light reveal justify-center after:h-px after:w-7 after:bg-current after:opacity-70 after:content-['']">About {S.businessName}</p>
          <h1 id="aboutTitle" className="reveal d1 mx-auto max-w-5xl font-serif text-[clamp(3rem,8.2vw,7.4rem)] font-light leading-[.95] tracking-[-.02em]">
            The Scent of Elegance, <em className="text-gold">born in Accra.</em>
          </h1>
          <p className="reveal d2 mx-auto mt-8 max-w-[52ch] text-[clamp(1rem,1.3vw,1.15rem)] text-ivory/70">
            A Ghanaian fragrance house on a simple mission: authentic, world-class scents — chosen with care, priced for real life and delivered to your door.
          </p>
          <div className="hero-ctas reveal d3 mt-10 justify-center">
            <a href="#story" className="btn btn-gold">Read Our Story</a>
            <Link href="/shop" className="btn btn-ghost-light">Explore Collection</Link>
          </div>

          {/* arched triptych */}
          <div aria-hidden="true" className="relative mx-auto mt-[clamp(56px,7vw,90px)] grid max-w-5xl grid-cols-3 items-end gap-[clamp(10px,2vw,28px)]">
            <span className="pointer-events-none absolute -inset-x-6 bottom-0 top-[18%] rounded-t-[999px] border border-gold/25 max-sm:hidden" />
            {([['angham', 1, 'aspect-[3/4]', 'd1'], ['club-de-nuit', 0, 'aspect-[3/5]', ''], ['shamoki', 2, 'aspect-[3/4]', 'd2']] as const).map(([slug, i, ratio, delay]) => (
              <figure key={slug} className={`reveal-img ${delay} relative overflow-hidden rounded-t-[999px] bg-charcoal ${ratio}`}>
                <ProductImage {...img(slug, i)} alt="" sizes="(max-width: 768px) 33vw, 340px" priority={i === 0} dark className="object-cover transition-transform duration-[1.6s] ease-out hover:scale-105" />
                <span className="absolute inset-0 bg-linear-to-t from-ink/60 via-transparent to-transparent" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── NUMBERS ──────────────────────────────────────── */}
      <section id="numbers" className="border-b border-line bg-ivory-2" aria-label="Classy Luxe in numbers">
        <dl className="container grid grid-cols-2 lg:grid-cols-4">
          {[
            { to: 500, suffix: '+', label: 'Happy clients' },
            { to: 16, suffix: '', label: 'Regions served' },
            { to: categories.length, suffix: '', label: 'Product categories' },
            { to: 2, suffix: '', label: 'Collections' }
          ].map((s, i) => (
            <div key={s.label} className={`reveal d${i} flex flex-col items-center gap-2 py-12 text-center lg:py-16 ${i % 2 ? '' : 'border-r border-line'} ${i === 1 ? 'lg:border-r' : ''} ${i < 2 ? 'border-b border-line lg:border-b-0' : ''}`}>
              <dt className="order-2 text-[.68rem] uppercase tracking-[.26em] text-muted">{s.label}</dt>
              <dd className="order-1 font-serif text-[clamp(2.8rem,5vw,4.2rem)] font-light leading-none text-ink"><CountUp to={s.to} suffix={s.suffix} /></dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── STORY: three chapters ────────────────────────── */}
      <section className="section section-ivory" id="story" aria-labelledby="storyTitle">
        <div className="container">
          <div className="story-quote reveal">
            <p className="eyebrow">Our Story</p>
            <h2 className="story-statement" id="storyTitle">“Every person deserves to <em>smell extraordinary.</em>”</h2>
          </div>
          <div className="grid items-start gap-[clamp(40px,7vw,120px)] lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative mx-auto w-full max-w-[520px] lg:sticky lg:top-28">
              {/* offset gold frame */}
              <span aria-hidden="true" className="absolute -right-4 -top-4 bottom-12 left-10 rounded-t-[999px] border border-gold/45 max-sm:hidden" />
              <figure className="story-image reveal-img relative !max-w-none">
                <ProductImage {...img('berrys-weekend', 7)} sizes="(max-width: 1024px) 90vw, 520px" />
                <figcaption>Founded in Alhaji Lapaz, Accra</figcaption>
              </figure>
              {/* overlapping second photo */}
              <figure aria-hidden="true" className="reveal-img d2 absolute -bottom-10 -right-4 w-[38%] overflow-hidden border-[6px] border-ivory bg-beige shadow-[0_24px_50px_rgba(15,13,11,.18)] sm:-right-8">
                <div className="relative aspect-square"><ProductImage {...img('oud-arabia', 3)} alt="" sizes="200px" /></div>
              </figure>
              {/* brand card */}
              <div className="reveal d3 absolute -left-3 bottom-16 bg-ink px-6 py-5 text-ivory shadow-[0_24px_50px_rgba(15,13,11,.25)] sm:-left-8">
                <p className="font-serif text-3xl italic leading-none text-gold">CL</p>
                <p className="mt-2 text-[.62rem] uppercase tracking-[.3em] text-ivory/70">Proudly Ghanaian</p>
              </div>
            </div>
            <ol className="relative">
              <span aria-hidden="true" className="absolute bottom-6 left-[27px] top-6 w-px bg-linear-to-b from-gold via-gold/40 to-transparent max-sm:hidden" />
              {CHAPTERS.map((c, i) => (
                <li key={c.n} className={`reveal d${i} relative grid gap-3 pb-14 sm:grid-cols-[56px_1fr] sm:gap-8`}>
                  <span className="z-[1] grid h-14 w-14 place-items-center rounded-full border border-gold bg-ivory font-serif text-lg italic text-gold-deep">{c.n}</span>
                  <div>
                    <h3 className="mb-3 font-serif text-[clamp(1.7rem,2.6vw,2.2rem)] font-light text-ink">{c.title}</h3>
                    <p className="max-w-[58ch] text-[1.05rem] leading-relaxed text-text">{c.text}</p>
                  </div>
                </li>
              ))}
              {S.aboutText && (
                <li className="reveal relative grid gap-3 pb-14 sm:grid-cols-[56px_1fr] sm:gap-8">
                  <span className="z-[1] grid h-14 w-14 place-items-center rounded-full border border-gold bg-ivory font-serif text-lg italic text-gold-deep">04</span>
                  <p className="max-w-[58ch] self-center text-[1.05rem] leading-relaxed text-text">{S.aboutText}</p>
                </li>
              )}
              <li className="reveal sm:pl-[88px]"><p className="signature">— The Classy Luxe Family</p></li>
            </ol>
          </div>
        </div>
      </section>

      {/* ── VALUES ───────────────────────────────────────── */}
      <section className="section section-dark" aria-labelledby="valuesTitle">
        <div className="container">
          <header className="section-head split-head">
            <div>
              <p className="eyebrow eyebrow-light reveal">What We Stand For</p>
              <h2 className="h2 reveal d1" id="valuesTitle">Four promises,<br /><em>in every bottle.</em></h2>
            </div>
            <p className="lead lead-light reveal d2">The principles behind every fragrance we choose, every price we set and every order we deliver.</p>
          </header>
          <div className="grid border-t border-ivory/15 md:grid-cols-2">
            {VALUES.map((v, i) => (
              <article key={v.title} className={`reveal d${i % 2} group relative overflow-hidden border-b border-ivory/15 p-[clamp(28px,4vw,56px)] ${i % 2 === 0 ? 'md:border-r' : ''}`}>
                <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-6 font-serif text-[9rem] font-light leading-none text-ivory/[.04] transition-colors duration-700 group-hover:text-gold/10">0{i + 1}</span>
                <span className="mb-6 block h-px w-10 bg-gold transition-all duration-700 group-hover:w-24" />
                <h3 className="font-serif text-[clamp(2rem,3vw,2.6rem)] font-light text-ivory">{v.title}</h3>
                <p className="mt-3 text-lg text-gold-light">{v.text}</p>
                <p className="mt-3 max-w-[46ch] text-ivory/60">{v.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── TWO COLLECTIONS ──────────────────────────────── */}
      <section className="section section-ivory" aria-labelledby="colTitle">
        <div className="container">
          <header className="section-head center-head">
            <p className="eyebrow reveal">Two Collections</p>
            <h2 className="h2 reveal d1" id="colTitle">One standard <em>of luxury.</em></h2>
          </header>
          <div className="grid gap-6 md:grid-cols-2">
            {([
              ['student', 'Student Collection', 'Signature scents at student-friendly prices — with free delivery around the GCTU campus.', student, 'ophelia', 6],
              ['general', 'General Collection', 'Statement 100ml fragrances — oud, saffron, amber and modern icons for every occasion.', general, 'club-de-nuit', 8]
            ] as const).map(([key, title, text, stats, slug, i]) => (
              <ShopLink key={key} collection={key} className="col-panel reveal-img min-h-[480px]">
                <ProductImage {...img(slug, i)} sizes="(max-width: 768px) 100vw, 50vw" />
                <div className="col-panel-copy">
                  <h3>{title}</h3>
                  <p>{text}</p>
                  {stats.n > 0 && <span className="col-meta">{stats.from != null && `From ${money(stats.from)} · `}{stats.n} fragrance{stats.n === 1 ? '' : 's'}</span>}
                  <span className="text-link">Shop {title.split(' ')[0]} <i aria-hidden="true">→</i></span>
                </div>
              </ShopLink>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS: bento grid of steps + photo slideshows ── */}
      <section className="section section-dark" aria-labelledby="howTitle">
        <div className="container">
          <header className="section-head split-head">
            <div>
              <p className="eyebrow eyebrow-light reveal">The Classy Luxe Experience</p>
              <h2 className="h2 reveal d1" id="howTitle">From our shelf<br /><em>to your signature.</em></h2>
            </div>
            <p className="lead lead-light reveal d2">Ordering is personal and simple — a real person confirms every order.</p>
          </header>
          <div className="reveal d2">
            <StepsBento
              steps={[
                { title: 'You discover your scent', text: 'Browse the shop, filter by scent notes, or let our signature-scent finder suggest a match.', footer: 'Browse the shop', href: '/shop' },
                { title: 'You place the order', text: 'Add to your bag and check out — or simply send us a message on WhatsApp.', footer: 'Order on WhatsApp', waText: `Hello ${S.businessName}! I'd like to place an order.` },
                { title: 'We confirm with you', text: 'A real person confirms availability, delivery and payment with you directly — no guesswork.', footer: 'Talk to us', href: '/contact' },
                { title: 'It arrives at your door', text: 'Discreet, secure packaging to all 16 regions of Ghana — with free delivery around GCTU.', footer: 'Estimated 1 – 3 days', href: '/#delivery' }
              ]}
              slides={[
                [img('angham', 0), img('yara', 1)],
                [img('barakkat-rouge', 2), img('club-de-nuit', 3)],
                [img('oud-arabia', 4), img('hawas-ice', 5)],
                [img('shamoki', 6), img('9pm-rebel', 7)]
              ]}
            />
          </div>
          <ul className="reveal mt-10 flex flex-wrap justify-center gap-x-10 gap-y-3 text-[.72rem] uppercase tracking-[.22em] text-ivory/55">
            {['100% authentic', 'Discreet, secure packaging', 'WhatsApp tracking', 'Estimated 1 – 3 business days'].map((t) => (
              <li key={t} className="flex items-center gap-3"><span aria-hidden="true" className="text-gold">✦</span>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── VISIT / CONTACT ──────────────────────────────── */}
      <section className="section" aria-labelledby="visitTitle">
        <div className="container grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow reveal">Find Us</p>
            <h2 className="h2 reveal d1" id="visitTitle">Rooted in <em>Alhaji Lapaz.</em></h2>
            <p className="lead reveal d2 mt-5">Based in Accra and delivering across Ghana. The quickest way to reach us is WhatsApp.</p>
          </div>
          <dl className="reveal d2 grid gap-px border border-line bg-line sm:grid-cols-2">
            {S.addressLine1 && (
              <div className="bg-ivory-2 p-7">
                <dt className="text-[.66rem] uppercase tracking-[.22em] text-muted">Location</dt>
                <dd className="mt-2 font-serif text-xl text-ink">{S.addressLine1}{S.addressLine2 && <span className="block text-base text-muted">{S.addressLine2}</span>}</dd>
                {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-gold-deep underline-offset-4 hover:underline">View on Google Maps ↗</a>}
              </div>
            )}
            {S.businessHours && (
              <div className="bg-ivory-2 p-7">
                <dt className="text-[.66rem] uppercase tracking-[.22em] text-muted">Opening hours</dt>
                <dd className="mt-2 font-serif text-xl text-ink">{S.businessHours}</dd>
              </div>
            )}
            <div className="bg-ivory-2 p-7">
              <dt className="text-[.66rem] uppercase tracking-[.22em] text-muted">WhatsApp</dt>
              <dd className="mt-2 font-serif text-xl text-ink"><WaLink className="hover:text-gold-deep">{S.whatsappDisplay}</WaLink></dd>
            </div>
            {S.phoneNumber && (
              <div className="bg-ivory-2 p-7">
                <dt className="text-[.66rem] uppercase tracking-[.22em] text-muted">Phone</dt>
                <dd className="mt-2 font-serif text-xl text-ink"><a href={`tel:${S.phoneNumber}`} className="hover:text-gold-deep">{S.phoneDisplay || S.phoneNumber}</a></dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section className="final-cta" aria-labelledby="aboutCtaTitle">
        <div className="final-bg" aria-hidden="true"><ProductImage {...img('9pm-rebel', 9)} alt="" sizes="100vw" dark /></div>
        <div className="container final-inner">
          <p className="eyebrow eyebrow-light reveal">{S.businessName}</p>
          <h2 className="final-title reveal d1" id="aboutCtaTitle">Find the scent<br />they&apos;ll <em>remember you by.</em></h2>
          <div className="hero-ctas reveal d2">
            <Link href="/shop" className="btn btn-gold">Explore Collection</Link>
            <WaLink className="btn btn-ghost-light" text={`Hello ${S.businessName}! I'd like help choosing a fragrance.`}><WhatsAppIcon />Talk to Us on WhatsApp</WaLink>
          </div>
        </div>
      </section>
    </>
  );
}
