'use client';

import Image from 'next/image';
import { useState } from 'react';

interface Props {
  src?: string | null;
  alt: string;
  name?: string;
  sizes: string;
  priority?: boolean;
  dark?: boolean;
  className?: string;
}

/** Product photo with an elegant placeholder when missing or broken. */
export function ProductImage({ src, alt, name, sizes, priority, dark, className }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`ph${dark ? ' ph-dark' : ''}`} role="img" aria-label={name ? `${name} — photo coming soon` : 'Classy Luxe'}>
        <span className="ph-mark">CL</span>
        {name && (
          <>
            <span className="ph-name">{name}</span>
            <span className="ph-note">Photo coming soon</span>
          </>
        )}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className ?? 'object-cover'}
      onError={() => setFailed(true)}
    />
  );
}
