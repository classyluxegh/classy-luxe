import Link from 'next/link';
import type { Category, StoreSettings } from '@/lib/types';
import { WaLink } from './WaLink';
import { WhatsAppIcon } from './Icons';
import { ShopLink } from './ShopLink';
import { LogoLink } from './LogoLink';

export function Footer({ categories, settings: s }: { categories: Category[]; settings: StoreSettings }) {
  return (
    <>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <LogoLink className="wordmark wordmark-footer" aria-label="Classy Luxe — back to top"><span className="wordmark-main">Classy <em>Luxe</em></span></LogoLink>
              <p className="footer-tag">{s.tagline}</p>
              <p>Premium fragrances for those who understand that elegance is not a luxury — it is a way of life. Proudly Ghanaian, from Alhaji Lapaz, Accra.</p>
            </div>
            <nav aria-label="Footer — explore">
              <h3>Explore</h3>
              <ul>
                <li><Link href="/">Home</Link></li>
                <li><ShopLink>Shop</ShopLink></li>
                <li><Link href="/#collections">Collections</Link></li>
                <li><Link href="/#bestsellers">Best Sellers</Link></li>
                <li><Link href="/#finder">Find Your Scent</Link></li>
                <li><Link href="/about">About</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </nav>
            <nav aria-label="Footer — categories">
              <h3>Categories</h3>
              <ul>{categories.map((c) => <li key={c.id}><ShopLink category={c.slug}>{c.name}</ShopLink></li>)}</ul>
            </nav>
            <div>
              <h3>Contact</h3>
              <ul>
                <li><WaLink>WhatsApp · {s.whatsappDisplay}</WaLink></li>
                {s.phoneNumber && <li><a href={`tel:${s.phoneNumber}`}>Phone · {s.phoneDisplay || s.phoneNumber}</a></li>}
                {s.email && <li><a href={`mailto:${s.email}`}>{s.email}</a></li>}
                {s.instagramUrl && <li><a href={s.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram · {s.instagramHandle}</a></li>}
                {s.snapchatHandle && <li>Snapchat · {s.snapchatHandle}</li>}
                {s.tiktokUrl && <li><a href={s.tiktokUrl} target="_blank" rel="noopener noreferrer">TikTok</a></li>}
                {s.facebookUrl && <li><a href={s.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a></li>}
                {s.addressLine1 && <li>{s.addressLine1}</li>}
                {s.businessHoursShort && <li>{s.businessHoursShort}</li>}
              </ul>
            </div>
            <div>
              <h3>Delivery</h3>
              <ul>
                <li><Link href="/#delivery">Nationwide · all 16 regions</Link></li>
                <li><Link href="/#gctu">Free GCTU campus delivery</Link></li>
                <li>Estimated 1 – 3 business days</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} {s.businessName}. All rights reserved. Crafted with elegance in Accra, Ghana.</p>
            <nav className="footer-legal" aria-label="Policies">
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms &amp; Conditions</Link>
              <Link href="/returns">Returns &amp; Refunds</Link>
            </nav>
          </div>
        </div>
      </footer>
      <WaLink className="float-wa" text="Hello Classy Luxe! I'd like to enquire about your fragrances." aria-label="Chat with Classy Luxe on WhatsApp">
        <WhatsAppIcon size={26} />
      </WaLink>
    </>
  );
}
