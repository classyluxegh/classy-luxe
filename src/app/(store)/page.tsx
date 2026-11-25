import Image from 'next/image';
import Link from 'next/link';
import { getCatalog } from '@/lib/catalog';
import { minPrice } from '@/lib/types';
import type { Collection } from '@/lib/types';
import { money } from '@/lib/money';
import { REGIONS } from '@/lib/site';
import { publicEnv } from '@/lib/env';
import { ProductImage } from '@/components/store/ProductImage';
import { pickImage } from '@/lib/pick-image';
import { ShopLink } from '@/components/store/ShopLink';
import { WaLink } from '@/components/store/WaLink';
import { Finder } from '@/components/store/Finder';
import { BestSellers } from '@/components/store/BestSellers';
import { Testimonials } from '@/components/store/Testimonials';
import { WhyList } from '@/components/store/WhyList';
import { OffersForm } from '@/components/store/Forms';

const pic = pickImage;

export default async function HomePage() {
  const { products, categories, settings: S } = await getCatalog();
  const instagram = S.instagramUrl || '';
  const fromPrice = (c: Collection) => {
    const list = products.filter((p) => p.collection === c);
    return list.length ? { min: Math.min(...list.map(minPrice)), n: list.length } : null;
  };
  const student = fromPrice('student');
  const general = fromPrice('general');
  const ribbon = [...categories.map((c) => c.name), 'Nationwide Delivery · 16 Regions', 'Free Delivery @ GCTU', `Order on WhatsApp · ${S.whatsappDisplay}`];
  const featured = products.filter((p) => p.isFeatured && p.images.length);
  const heroMain = featured[0] ? pic(products, featured[0].slug, 0) : pic(products, 'club-de-nuit', 0);
  const heroInset = featured[1] ? pic(products, featured[1].slug, 1) : pic(products, 'shamoki', 1);
  const social = products.filter((p) => p.images.length).slice(0, 6);

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Store', name: S.businessName, slogan: S.tagline, url: publicEnv.siteUrl,
    telephone: S.phoneNumber || undefined, openingHours: 'Mo-Sa 08:00-20:00', areaServed: 'Ghana', currenciesAccepted: 'GHS', sameAs: [instagram, S.tiktokUrl, S.facebookUrl].filter(Boolean),
    address: { '@type': 'PostalAddress', streetAddress: 'Alhaji Lapaz', addressLocality: 'Accra', addressRegion: 'Greater Accra', addressCountry: 'GH' }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <section className="hero" id="top" aria-labelledby="heroTitle">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-grid">
          <div className="hero-copy">
            <h1 className="hero-title reveal d1" id="heroTitle">
              <span className="line">More Than</span><span className="line">a Fragrance.</span><span className="line"><em>A Signature.</em></span>
            </h1>
            <p className="hero-text reveal d2">Discover fragrances that capture your personality, elevate your presence and leave an unforgettable impression.</p>
            <div className="hero-ctas reveal d3">
              <Link href="/shop" className="btn btn-gold">Explore Collection</Link>
              <Link href="/about" className="btn btn-ghost-light">Discover Classy Luxe</Link>
            </div>
            <dl className="hero-stats reveal d4">
              <div><dt>50+</dt><dd>Fragrances</dd></div>
              <div><dt>500+</dt><dd>Happy clients</dd></div>
              <div><dt>16</dt><dd>Regions served</dd></div>
            </dl>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <figure className="hero-arch reveal-img">
              <ProductImage src={heroMain.src} alt="" sizes="(max-width: 1024px) 90vw, 45vw" priority dark />
            </figure>
            <figure className="hero-inset reveal-img d2">
              <ProductImage src={heroInset.src} alt="" sizes="(max-width: 1024px) 40vw, 18vw" dark />
            </figure>
          </div>
        </div>
        <a href="#collections" className="scroll-cue" aria-label="Scroll to collections"><span /></a>
      </section>

      <div className="ribbon" aria-hidden="true">
        <div className="ribbon-track">{[...ribbon, ...ribbon].map((t, i) => <span key={i}>{t}</span>)}</div>
      </div>

      {/* COLLECTIONS */}
      <section className="section collections" id="collections" aria-labelledby="colTitle">
        <div className="container">
          <header className="section-head split-head">
            <div>
              <p className="eyebrow reveal">The Collections</p>
              <h2 className="h2 reveal d1" id="colTitle">Two collections.<br /><em>One standard of luxury.</em></h2>
            </div>
            <p className="lead reveal d2">Whether you are on campus or in the boardroom, every Classy Luxe fragrance is chosen for character, longevity and the impression it leaves behind.</p>
          </header>
          <div className="col-editorial">
            <ShopLink collection="general" className="col-panel col-panel-lg reveal-img">
              <ProductImage {...pic(products, 'barakkat-rouge', 2)} sizes="(max-width: 1024px) 100vw, 58vw" />
              <div className="col-panel-copy">
                <h3>General Collection</h3>
                <p>Statement 100ml fragrances — oud, saffron, amber and modern icons.</p>
                {general && <span className="col-meta">From {money(general.min)} · {general.n} fragrances</span>}
                <span className="text-link">Shop General <i aria-hidden="true">→</i></span>
              </div>
            </ShopLink>
            <ShopLink collection="student" className="col-panel col-panel-sm reveal-img d1">
              <ProductImage {...pic(products, 'angham', 3)} sizes="(max-width: 1024px) 100vw, 40vw" />
              <div className="col-panel-copy">
                <h3>Student Collection</h3>
                <p>Signature scents at student-friendly prices, with free GCTU campus delivery.</p>
                {student && <span className="col-meta">From {money(student.min)} · {student.n} fragrances</span>}
                <span className="text-link">Shop Student <i aria-hidden="true">→</i></span>
              </div>
            </ShopLink>
            <div className="col-categories reveal d2">
              <h3 className="col-cat-title">Shop by category</h3>
              <ul className="col-cat-list">
                {categories.map((c) => (
                  <li key={c.id}>
                    <ShopLink category={c.slug} className="flex w-full items-baseline justify-between gap-4 py-[11px] transition-all hover:pl-2 hover:text-gold-deep">
                      <span className="cat-name">{c.name}</span>
                      <span className="cat-count">{c.productCount ? `${c.productCount} item${c.productCount > 1 ? 's' : ''}` : 'Enquire'}</span>
                    </ShopLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <BestSellers />

      {/* FINDER */}
      <section className="section finder" id="finder" aria-labelledby="finderTitle">
        <div className="container finder-grid">
          <div className="finder-intro">
            <p className="eyebrow reveal">Discover Your Signature Scent</p>
            <h2 className="h2 reveal d1" id="finderTitle">Tell us what you love.<br /><em>We&apos;ll find your signature.</em></h2>
            <p className="lead reveal d2">Choose the mood that feels most like you, and a budget. We&apos;ll match you with fragrances from our collection based on their notes.</p>
          </div>
          <Finder />
        </div>
      </section>

      {/* WHY */}
      <section className="section section-ivory why" id="why" aria-labelledby="whyTitle">
        <div className="container why-grid">
          <div className="why-visual reveal-img"><ProductImage {...pic(products, 'oud-arabia', 4)} sizes="(max-width: 1024px) 100vw, 40vw" /></div>
          <div className="why-copy">
            <p className="eyebrow reveal">Why Classy Luxe</p>
            <h2 className="h2 reveal d1" id="whyTitle">Luxury you can<br /><em>trust, every time.</em></h2>
            <div className="reveal d2">
              <WhyList items={[
                ['Authentic fragrances', 'Every fragrance is genuine, sourced from trusted premium suppliers.'],
                ['Premium quality', 'Long-lasting formulations chosen for character, projection and longevity.'],
                ['Affordable luxury', 'World-class scents at prices every Ghanaian can embrace — including our Student Collection.'],
                ['Reliable customer service', 'Order online or on WhatsApp and speak to a real person, Monday to Saturday.'],
                ['Nationwide delivery', 'Discreet, secure packaging delivered across all 16 regions of Ghana.']
              ]} />
            </div>
          </div>
        </div>
      </section>

      {/* DELIVERY */}
      <section className="section section-dark delivery" id="delivery" aria-labelledby="delTitle">
        <div className="container delivery-grid">
          <div className="delivery-copy">
            <p className="eyebrow eyebrow-light reveal">Nationwide Delivery</p>
            <h2 className="h2 reveal d1" id="delTitle">From Accra to every<br /><em>corner of Ghana.</em></h2>
            <p className="lead lead-light reveal d2">No matter where you are, Classy Luxe brings luxury fragrance to your door — across all 16 regions, with care and speed.</p>
            <ul className="tick-list reveal d3">
              <li>Accra, Kumasi, Tamale &amp; all major cities</li>
              <li>Discreet, secure packaging on every order</li>
              <li>WhatsApp tracking from dispatch to delivery</li>
              <li>Estimated delivery: 1 – 3 business days</li>
            </ul>
            <Link href="/shop" className="btn btn-gold reveal d4">Shop for Delivery</Link>
          </div>
          <div className="regions reveal d2">
            <p className="regions-title"><span>16</span> regions served</p>
            <ul className="regions-list">{REGIONS.map((r) => <li key={r}>{r}{r === 'Greater Accra' && <small>Home</small>}</li>)}</ul>
          </div>
        </div>
      </section>

      {/* GCTU */}
      <section className="section gctu" id="gctu" aria-labelledby="gctuTitle">
        <div className="container gctu-grid">
          <div className="gctu-images" aria-hidden="true">
            <figure className="reveal-img"><ProductImage {...pic(products, 'aventos', 5)} alt="" sizes="(max-width: 1024px) 66vw, 33vw" /></figure>
            <figure className="reveal-img d2"><ProductImage {...pic(products, 'yara', 6)} alt="" sizes="(max-width: 1024px) 50vw, 25vw" /></figure>
          </div>
          <div className="gctu-copy">
            <p className="eyebrow reveal">Student Special · GCTU</p>
            <h2 className="h2 reveal d1" id="gctuTitle">Free delivery<br /><em>around GCTU.</em></h2>
            <p className="lead reveal d2">Students deserve luxury without compromise. Classy Luxe offers complimentary delivery within the GCTU campus area.</p>
            <ul className="gctu-facts reveal d3">
              <li><strong>Free</strong><span>delivery within GCTU campus area</span></li>
              {student && <li><strong>{money(student.min)}</strong><span>Student Collection starting price</span></li>}
              <li><strong>“GCTU”</strong><span>just mention it when you WhatsApp us</span></li>
              <li><strong>Mon – Sat</strong><span>8AM – 8PM</span></li>
            </ul>
            <div className="gctu-ctas reveal d4">
              <ShopLink collection="student" className="btn btn-dark">Shop Student Collection</ShopLink>
              <WaLink className="btn btn-outline" text="Hello! I'm a GCTU student and I'd like free delivery.">Claim Student Delivery</WaLink>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section testimonials" id="testimonials" aria-labelledby="testiTitle">
        <div className="container">
          <header className="section-head center-head">
            <p className="eyebrow reveal">Client Stories</p>
            <h2 className="h2 reveal d1" id="testiTitle">Voices of <em>elegance</em></h2>
          </header>
          <Testimonials />
        </div>
      </section>

      {/* SOCIAL */}
      <section className="section section-dark social" id="social" aria-labelledby="socialTitle">
        <div className="container social-head">
          <div>
            <p className="eyebrow eyebrow-light reveal">Follow the Scent</p>
            <h2 className="h2 reveal d1" id="socialTitle">Join us on <em>Instagram</em></h2>
          </div>
          <div className="social-links reveal d2">
            <p>New arrivals, restocks and behind-the-scenes on Instagram &amp; Snapchat.</p>
            {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-light">Follow {S.instagramHandle}</a>}
          </div>
        </div>
        <div className="social-strip">
          {social.map((p) => (
            <a key={p.id} className="social-tile" href={instagram || '/shop'} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} on Instagram`}>
              <ProductImage src={p.images[0].url} alt="" sizes="(max-width: 720px) 50vw, 17vw" dark />
            </a>
          ))}
        </div>
      </section>

      {/* OFFERS */}
      <section className="section offers" id="offers" aria-labelledby="offersTitle">
        <div className="container offers-inner">
          <div>
            <p className="eyebrow reveal">Exclusive Offers</p>
            <h2 className="h2 reveal d1" id="offersTitle">Be first to know about<br /><em>new arrivals.</em></h2>
            <p className="lead reveal d2">Join our WhatsApp list for restocks, new fragrances and special offers. Tapping join opens WhatsApp with your request ready to send — you&apos;re added once you send it.</p>
          </div>
          <OffersForm />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta" aria-labelledby="finalTitle">
        <div className="final-bg" aria-hidden="true">
          {pic(products, '9pm-rebel', 8).src && <Image src={pic(products, '9pm-rebel', 8).src!} alt="" fill sizes="100vw" className="object-cover" />}
        </div>
        <div className="container final-inner">
          <p className="eyebrow eyebrow-light reveal">Classy Luxe</p>
          <h2 className="final-title reveal d1" id="finalTitle">Find the scent<br />they&apos;ll <em>remember you by.</em></h2>
          <div className="hero-ctas reveal d2">
            <Link href="/shop" className="btn btn-gold">Explore Collection</Link>
            <WaLink className="btn btn-ghost-light" text="Hello Classy Luxe! I'd like help choosing a fragrance.">Ask for a Recommendation</WaLink>
          </div>
        </div>
      </section>
    </>
  );
}
