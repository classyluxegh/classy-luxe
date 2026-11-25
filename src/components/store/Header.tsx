'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BagIcon } from './Icons';
import { WaLink } from './WaLink';
import { ShopLink } from './ShopLink';
import { LogoLink } from './LogoLink';
import { useStore } from './StoreProvider';
import { motion } from 'framer-motion';

const NAV = [
  { href: '/#top', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' }
];

export function Header() {
  const pathname = usePathname();
  // Pages that open with a dark full-height hero get a see-through header at the top
  const overHero = pathname === '/' || pathname === '/about';
  const [solid, setSolid] = useState(!overHero);
  const [menu, setMenu] = useState(false);
  const { count, openDrawer, bump, settings } = useStore();

  useEffect(() => {
    if (!overHero) { setSolid(true); return; }
    const hero = document.querySelector<HTMLElement>('.hero');
    const onScroll = () => setSolid(window.scrollY > Math.max(40, (hero?.offsetHeight ?? 400) - 90));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);

  useEffect(() => {
    document.body.classList.toggle('locked', menu);
    document.body.classList.toggle('nav-open', menu);
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  useEffect(() => { setMenu(false); }, [pathname]);


  return (
    <>
      <header className={`site-header${solid ? ' solid' : ''}`}>
        <div className="header-inner">
          <button className="icon-btn menu-btn" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} aria-controls="mobileNav" onClick={() => setMenu((m) => !m)}>
            <span /><span />
          </button>
          <LogoLink className="wordmark" aria-label="Classy Luxe — home" onClick={() => setMenu(false)}>
            <span className="wordmark-main">Classy <em>Luxe</em></span>
            <span className="wordmark-sub">{settings.tagline}</span>
          </LogoLink>
          <nav className="main-nav" aria-label="Main">
            {NAV.map((n) => n.href === '/shop'
              ? <ShopLink key={n.href} className={pathname === '/shop' ? 'active' : undefined}>{n.label}</ShopLink>
              : <Link key={n.href} href={n.href}>{n.label}</Link>)}
          </nav>
          <div className="header-actions">
            <ShopLink className="btn btn-gold btn-sm header-cta">Shop Now</ShopLink>
            <button className="icon-btn cart-btn" aria-label={`Open shopping bag, ${count} item${count === 1 ? '' : 's'}`} onClick={openDrawer}>
              <BagIcon />
              <motion.span key={bump} initial={bump ? { scale: 1.6 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className={`cart-count${count > 0 ? ' has' : ''}`} aria-hidden="true">{count > 99 ? '99+' : count}</motion.span>
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-nav${menu ? ' open' : ''}`} id="mobileNav" aria-hidden={!menu}>
        <nav aria-label="Mobile">
          {[...NAV.slice(0, 2), { href: '/#finder', label: 'Find Your Scent' }, NAV[2], { href: '/#delivery', label: 'Delivery' }, NAV[3]].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMenu(false)} tabIndex={menu ? 0 : -1}>{n.label}</Link>
          ))}
        </nav>
        <div className="mobile-nav-foot">
          <ShopLink className="btn btn-gold" onClick={() => setMenu(false)} tabIndex={menu ? 0 : -1}>Shop the Collection</ShopLink>
          <p>WhatsApp <WaLink tabIndex={menu ? 0 : -1}>{settings.whatsappDisplay}</WaLink></p>
          {settings.businessHoursShort && <p>{settings.businessHoursShort}</p>}
        </div>
      </div>
    </>
  );
}
