import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalog } from '@/lib/catalog';
import { WaLink } from '@/components/store/WaLink';
import { ContactForm } from '@/components/store/Forms';
import { WhatsAppIcon } from '@/components/store/Icons';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Classy Luxe in Alhaji Lapaz, Accra. Order or ask about fragrances on WhatsApp, call us, or send a message. Open Monday to Saturday, 8AM – 8PM.',
  alternates: { canonical: '/contact' }
};

export default async function ContactPage() {
  const { settings: S } = await getCatalog();
  const instagram = S.instagramUrl || '';

  return (
    <>
      <section className="section section-ivory contact" id="contact" aria-labelledby="contactTitle" style={{ paddingTop: 'clamp(130px, 14vw, 190px)' }}>
        <div className="container contact-grid">
          <div className="contact-info">
            <p className="eyebrow reveal">Get in Touch</p>
            <h1 className="h2 reveal d1" id="contactTitle">We&apos;d love to<br /><em>hear from you.</em></h1>
            <WaLink className="btn btn-dark btn-wa reveal d2 mt-8" text={`Hello ${S.businessName}! I'd like to enquire about your fragrances.`}>
              <WhatsAppIcon />Chat on WhatsApp
            </WaLink>
            <dl className="contact-list reveal d2">
              {S.addressLine1 && <div><dt>Location</dt><dd>{S.addressLine1}{S.addressLine2 && <><br />{S.addressLine2}</>}</dd></div>}
              <div><dt>WhatsApp</dt><dd><WaLink>{S.whatsappDisplay}</WaLink></dd></div>
              {S.phoneNumber && <div><dt>Phone</dt><dd><a href={`tel:${S.phoneNumber}`}>{S.phoneDisplay || S.phoneNumber}</a></dd></div>}
              {S.email && <div><dt>Email</dt><dd><a href={`mailto:${S.email}`}>{S.email}</a></dd></div>}
              {instagram && <div><dt>Instagram{S.snapchatHandle ? ' / Snapchat' : ''}</dt><dd><a href={instagram} target="_blank" rel="noopener noreferrer">{S.instagramHandle}</a></dd></div>}
              {S.tiktokUrl && <div><dt>TikTok</dt><dd><a href={S.tiktokUrl} target="_blank" rel="noopener noreferrer">Follow us</a></dd></div>}
              {S.facebookUrl && <div><dt>Facebook</dt><dd><a href={S.facebookUrl} target="_blank" rel="noopener noreferrer">Follow us</a></dd></div>}
              {S.businessHours && <div><dt>Business Hours</dt><dd>{S.businessHours}</dd></div>}
            </dl>
          </div>
          {/* On wide screens, push the form down by the eyebrow label's height (text + gap)
              so the card's top lines up with the heading on the left. */}
          <div className="min-[1025px]:pt-[calc(.72rem*1.65+22px)]">
            <ContactForm />
          </div>
        </div>
      </section>

      {(S.deliveryInfo || S.studentDeliveryInfo) && (
        <section className="section section-dark" aria-labelledby="deliveryTitle" style={{ paddingTop: 'clamp(64px, 8vw, 110px)', paddingBottom: 'clamp(64px, 8vw, 110px)' }}>
          <div className="container grid gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow eyebrow-light reveal">Delivery</p>
              <h2 className="h2 reveal d1" id="deliveryTitle">Across Ghana, <em>with care.</em></h2>
            </div>
            <div className="grid gap-8 text-ivory/75">
              {S.deliveryInfo && (
                <div className="reveal d1">
                  <h3 className="mb-2 font-serif text-2xl text-ivory">Nationwide</h3>
                  <p>{S.deliveryInfo}</p>
                </div>
              )}
              {S.studentDeliveryInfo && (
                <div className="reveal d2">
                  <h3 className="mb-2 font-serif text-2xl text-ivory">GCTU students</h3>
                  <p>{S.studentDeliveryInfo}</p>
                </div>
              )}
              <div className="reveal d3"><Link href="/shop" className="btn btn-gold">Explore Collection</Link></div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
