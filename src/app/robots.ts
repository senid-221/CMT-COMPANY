import type { MetadataRoute } from 'next';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

/** Keep private flows out of the index; the storefront itself stays open to every bot. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/seller',
          '/api/',
          '/cart',
          '/checkout',
          '/orders',
          '/track',
          '/notifications',
          '/saved',
          '/account',
          '/login',
          '/signup',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
