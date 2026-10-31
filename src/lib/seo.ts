/** Shared SEO constants and schema.org builders, kept free of DB access so any route can import them. */

export const SITE_NAME = 'CityMarket';

export const SITE_DESCRIPTION =
  'CityMarket is an online marketplace: groceries, beauty, drinks, fashion and electronics from trusted sellers, delivered with cash on delivery.';

/** Absolute origin, no trailing slash. Set NEXT_PUBLIC_SITE_URL on the server that builds the site. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The generated share card at the app root; pages that override openGraph must attach it explicitly. */
export const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'CityMarket — everyday essentials delivered',
};

/** Meta descriptions are cut around 160 characters; never split a word in half. */
export function clampText(text: string, max = 158) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > 60 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(trail: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logo.svg'),
    description: SITE_DESCRIPTION,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl('/shop')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}
