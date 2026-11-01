import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { getMarket } from '@/lib/market';
import { getVendorProducts, localizedName } from '@/lib/catalog';
import { getPublicVendor } from '@/lib/vendors';
import { absoluteUrl, breadcrumbJsonLd, clampText, OG_IMAGE } from '@/lib/seo';
import { ProductGrid } from '@/components/shop-ui';
import { JsonLd } from '@/components/json-ld';
import { StoreIcon } from '@/components/icons';

const slug = (value: string) => value.trim().slice(0, 60);

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const vendor = await getPublicVendor(slug((await params).handle));
  if (!vendor) return { title: 'Store not found' };
  const path = `/store/${vendor.handle}`;
  const description = clampText(vendor.tagline || vendor.about || `Shop ${vendor.name} on CityMarket.`);
  return {
    title: vendor.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: 'CityMarket',
      url: path,
      title: vendor.name,
      description,
      images: [vendor.logo ? { url: vendor.logo, alt: vendor.name } : OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title: vendor.name, description, images: [vendor.logo ?? OG_IMAGE.url] },
  };
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const handle = slug((await params).handle);
  const [{ category }, locale, market, vendor] = await Promise.all([searchParams, getLocale(), getMarket(), getPublicVendor(handle)]);
  if (!vendor) notFound();

  const products = await getVendorProducts(vendor.id);
  const categories = [...new Map(products.map((product) => [product.category.handle, product.category])).values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const activeCategory = categories.some((item) => item.handle === category) ? category : '';
  const shown = activeCategory ? products.filter((product) => product.category.handle === activeCategory) : products;
  const path = `/store/${vendor.handle}`;
  const since = new Date(vendor.createdAt).getFullYear();
  const description = vendor.tagline || vendor.about || `Shop ${vendor.name} on CityMarket.`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: vendor.name,
    url: absoluteUrl(path),
    description,
    ...(vendor.logo ? { image: vendor.logo.startsWith('/') ? absoluteUrl(vendor.logo) : vendor.logo } : {}),
    ...(vendor.city ? { address: { '@type': 'PostalAddress', addressLocality: vendor.city } } : {}),
    parentOrganization: { '@type': 'Organization', name: 'CityMarket', url: absoluteUrl('/') },
  };
  const crumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: vendor.name, path },
  ]);

  return (
    <div className="shell py-6">
      <JsonLd data={schema} />
      <JsonLd data={crumbs} />

      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/" className="font-semibold text-brand hover:underline">
          CityMarket
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-ink">{vendor.name}</span>
      </nav>

      <section className="overflow-hidden rounded-3xl border border-line bg-canvas">
        <div className="h-28 bg-gradient-to-r from-brand via-brand/80 to-lime sm:h-36" />
        <div className="px-5 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-canvas bg-surface-alt text-brand shadow-sm sm:h-28 sm:w-28">
                {vendor.logo ? (
                  <img src={vendor.logo} alt={`${vendor.name} logo`} width={112} height={112} className="h-full w-full object-cover" />
                ) : (
                  <StoreIcon size={40} />
                )}
              </div>
              <div className="min-w-0 pb-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand">
                  {t(locale, 'store.vendor')}
                </span>
                <h1 className="mt-1 truncate font-display text-2xl font-bold text-ink sm:text-3xl">{vendor.name}</h1>
                {vendor.tagline ? <p className="mt-0.5 text-sm font-medium text-ink/75">{vendor.tagline}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1 text-sm">
              <span className="rounded-full border border-line bg-canvas px-3 py-1.5 font-semibold text-label">
                {t(locale, 'store.products', { n: products.length })}
              </span>
              {vendor.city ? (
                <span className="rounded-full border border-line bg-canvas px-3 py-1.5 font-semibold text-label">{vendor.city}</span>
              ) : null}
              <span className="rounded-full border border-line bg-canvas px-3 py-1.5 font-semibold text-label">
                {t(locale, 'store.since', { year: since })}
              </span>
            </div>
          </div>

          {vendor.about ? (
            <div className="mt-5 max-w-3xl rounded-2xl bg-surface-alt p-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted">{t(locale, 'store.about')}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{vendor.about}</p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-ink">{t(locale, 'store.catalogue')}</h2>
        <Link href="/shop" className="text-sm font-semibold text-brand hover:underline">
          {t(locale, 'store.back')} →
        </Link>
      </div>

      {categories.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={path}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              activeCategory ? 'border-line bg-canvas hover:border-brand' : 'border-brand bg-brand text-white'
            }`}
          >
            {t(locale, 'store.all')}
          </Link>
          {categories.map((item) => (
            <Link
              key={item.handle}
              href={`${path}?category=${item.handle}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                activeCategory === item.handle ? 'border-brand bg-brand text-white' : 'border-line bg-canvas hover:border-brand'
              }`}
            >
              {localizedName(item, locale)}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        {shown.length ? (
          <ProductGrid products={shown} locale={locale} market={market} />
        ) : (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">{t(locale, 'store.empty')}</p>
            <Link href="/shop" className="btn btn-ghost mt-4">
              {t(locale, 'store.back')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
