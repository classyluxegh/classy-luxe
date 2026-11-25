import type { NextConfig } from 'next';

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' },
      // Legacy product photos carried over from the previous website.
      // Re-upload them through the admin dashboard, then these can be removed.
      { protocol: 'https', hostname: 'i.pinimg.com' },
      { protocol: 'https', hostname: 'perfumesandbeyondltd.com' }
    ]
  },
  experimental: {
    serverActions: { bodySizeLimit: '12mb' } // product image uploads (max 5 MB each)
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      }
    ];
  }
};

export default nextConfig;
