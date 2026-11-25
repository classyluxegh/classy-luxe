'use client';

import { waLink } from '@/lib/site';
import { useSettings } from './StoreProvider';

/** Link that opens a WhatsApp chat with Classy Luxe (number from Admin → Settings). */
export function WaLink({ text, className, children, ...rest }: { text?: string; className?: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { whatsappNumber } = useSettings();
  return (
    <a href={waLink(whatsappNumber, text)} target="_blank" rel="noopener noreferrer" className={className} {...rest}>
      {children}
    </a>
  );
}
