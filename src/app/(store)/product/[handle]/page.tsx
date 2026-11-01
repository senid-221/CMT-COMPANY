import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { formatMoney, toUnits } from '@/lib/money';
import { getMarket } from '@/lib/market';
import { getProduct, getRelated, localizedName } from '@/lib/catalog';
import { getApprovedReviews, reviewSummary } from '@/lib/reviews';
import { absoluteUrl, breadcrumbJsonLd, clampText } from '@/lib/seo';
import { ProductRail } from '@/components/shop-ui';
import { Rail } from '@/components/rail';
import { JsonLd } from '@/components/json-ld';
import { AddToCart } from '@/components/add-to-cart';
import { ReviewForm } from '@/components/review-form';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const [product, market] = await Promise.all([getProduct(handle), getMarket()]);
  if (!product) return { title: 'Product not found' };
  const path = `/product/${product.handle}`;
  const description = clampText(
    product.description?.trim() ||
      `Buy ${product.name} (${product.unit}) on CityMarket for ${formatMoney(product.priceCents, 'en', market)}, delivered with cash on delivery.`,
  );
  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: 'CityMarket',
      url: path,
      title: product.name,
      description,
      images: [{ url: product.image, alt: product.name }],
    },
    twitter: { card: 'summary', title: product.name, description, images: [product.image] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  const product = await getProduct(handle);
  if (!product) notFound();

  const related = await getRelated(handle, product.category.handle);
  const reviews = await getApprovedReviews(handle);
  const summary = reviewSummary(reviews);
  const description = locale === 'fr' ? product.descriptionFr ?? product.description : product.description;
  const lowStock = product.stock > 0 && product.stock <= 10;
  const dateFormat = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium' });

  const path = `/product/${product.handle}`;
  const schemaPrice = market.currency === 'USD' ? Number((product.priceCents / 100).toFixed(2)) : toUnits(product.priceCents, market);
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: [absoluteUrl(product.image)],
    description: product.description?.trim() || `${product.name} — ${product.unit}`,
    sku: product.handle,
    category: product.category.name,
    brand: { '@type': 'Brand', name: 'CityMarket' },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(path),
      priceCurrency: market.currency,
      price: schemaPrice,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'CityMarket' },
    },
    ...(summary.count
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: summary.average, reviewCount: summary.count } }
      : {}),
  };
  const productBreadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: product.category.name, path: `/category/${product.category.handle}` },
    { name: product.name, path },
  ]);

  return (
    <div className="shell py-8">
      <JsonLd data={productJsonLd} />
      <JsonLd data={productBreadcrumbs} />
      <Link href="/shop" className="mb-4 inline-block text-sm font-semibold text-brand hover:underline">
        ← {t(locale, 'product.backToShop')}
      </Link>

      <div className="card grid gap-6 p-6 md:grid-cols-[minmax(0,420px)_1fr]">
        <div className="grid place-items-center rounded-xl bg-surface-alt p-6">
          <img src={product.image} alt={localizedName(product, locale)} width={360} height={360} className="w-full max-w-[340px] object-contain" />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <Link href={`/category/${product.category.handle}`} className="text-xs font-semibold uppercase tracking-wide text-muted hover:text-brand">
              {localizedName(product.category, locale)}
            </Link>
            <h1 className="mt-1 font-display text-2xl font-bold">{localizedName(product, locale)}</h1>
            <p className="mt-1 text-sm text-muted">
              {t(locale, 'product.unit')}: {product.unit}
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <p className="font-display text-3xl font-bold text-brand">{formatMoney(product.priceCents, locale, market)}</p>
            {product.compareAtCents ? (
              <>
                <s className="text-lg text-muted">{formatMoney(product.compareAtCents, locale, market)}</s>
                <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                  -{Math.round((1 - product.priceCents / product.compareAtCents) * 100)}%
                </span>
              </>
            ) : null}
          </div>

          {description ? <p className="leading-relaxed text-ink/80">{description}</p> : null}

          <p className={`text-sm font-semibold ${lowStock ? 'text-warning' : 'text-success'}`}>
            {lowStock ? t(locale, 'product.lowStock', { n: product.stock }) : t(locale, 'product.stock')}
          </p>

          <div className="flex items-center gap-4 pt-2">
            <AddToCart handle={product.handle} locale={locale} image={product.image} />
            <Link href="/cart" className="text-sm font-semibold text-brand hover:underline">
              {t(locale, 'nav.cart')} →
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-semibold">{t(locale, 'reviews.title')}</h2>
            {summary.count ? (
              <>
                <span className="text-amber" aria-hidden>
                  {'★'.repeat(Math.round(summary.average))}
                  <span className="text-muted">{'★'.repeat(5 - Math.round(summary.average))}</span>
                </span>
                <span className="text-sm text-muted">
                  {t(locale, 'reviews.average', { avg: summary.average.toFixed(1) })} · {t(locale, 'reviews.count', { n: summary.count })}
                </span>
              </>
            ) : null}
          </div>

          {reviews.length ? (
            <Rail prevLabel={t(locale, 'rail.prev')} nextLabel={t(locale, 'rail.next')} autoAdvance>
              {reviews.map((review) => (
                <li key={review.id} role="listitem" className="card w-[280px] p-4 sm:w-[320px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{review.author}</p>
                    <p className="text-sm text-amber" aria-label={t(locale, 'reviews.star', { n: review.rating })}>
                      {'★'.repeat(review.rating)}
                      <span className="text-muted">{'★'.repeat(5 - review.rating)}</span>
                    </p>
                  </div>
                  <p className="mt-1.5 line-clamp-4 leading-relaxed text-ink/80">{review.body}</p>
                  <p className="mt-2 text-xs text-muted">{dateFormat.format(new Date(review.createdAt))}</p>
                </li>
              ))}
            </Rail>
          ) : (
            <p className="text-sm text-muted">{t(locale, 'reviews.empty')}</p>
          )}
        </div>

        <div className="card h-fit p-4">
          <h3 className="mb-3 font-display text-lg font-semibold">{t(locale, 'reviews.write')}</h3>
          <ReviewForm handle={product.handle} locale={locale} />
        </div>
      </section>

      {related.length ? (
        <section className="mt-10 space-y-4">
          <h2 className="font-display text-xl font-semibold">{t(locale, 'product.related')}</h2>
          <ProductRail products={related} locale={locale} market={market} prevLabel={t(locale, 'rail.prev')} nextLabel={t(locale, 'rail.next')} />
        </section>
      ) : null}
    </div>
  );
}
