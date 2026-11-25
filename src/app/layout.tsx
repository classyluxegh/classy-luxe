import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { SITE_DESCRIPTION } from '@/lib/site';
import { publicEnv } from '@/lib/env';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap'
});
const jost = Jost({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-jost', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: 'Classy Luxe — Luxury Perfumes & Fragrances in Accra, Ghana', template: '%s | Classy Luxe' },
  description: SITE_DESCRIPTION,
  openGraph: { type: 'website', siteName: 'Classy Luxe', title: 'Classy Luxe — The Scent of Elegance', description: SITE_DESCRIPTION, locale: 'en_GH' },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/icon.svg' }
};

export const viewport: Viewport = { themeColor: '#0F0D0B', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GH" className={`${cormorant.variable} ${jost.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
