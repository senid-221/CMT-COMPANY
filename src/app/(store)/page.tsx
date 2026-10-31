import Link from 'next/link';
import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { t, type Locale } from '@/lib/i18n';
import { getCategories, getDeals, getFeatured, getProducts, getProductsByHandles } from '@/lib/catalog';
import { getContent, pickText } from '@/lib/content';
import { CategoryTiles, FreeDeliveryNote, ProductGrid } from '@/components/shop-ui';

async function heroCopy(locale: Locale) {
  const content = await getContent();
  return {
    title: pickText(content.hero.title, locale) || t(locale, 'home.heroTitle'),
    text: pickText(content.hero.text, locale) || t(locale, 'home.heroText'),
    ctaLabel: pickText(content.hero.ctaLabel, locale) || t(locale, 'home.shopNow'),
    ctaHref: content.hero.ctaHref,
    note: pickText(content.delivery.note, locale),
    featuredHandles: content.featured.handles,
  };
}

export default async function HomePage() {
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  const hero = await heroCopy(locale);
  const [categories, featured, latest, deals] = await Promise.all([
    getCategories(),
    hero.featuredHandles.length ? getProductsByHandles(hero.featuredHandles) : getFeatured(),
    getProducts({ sort: 'name', take: 10 }),
    getDeals(5),
  ]);

  const heroImages = (featured.length ? featured : latest).slice(0, 3);

  return (
    <div className="shell space-y-10 py-8">
      <section className="relative overflow-hidden rounded-2xl bg-brand px-6 py-10 text-white sm:px-10">
        <div className="relative z-10 max-w-2xl space-y-4">
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{hero.title}</h1>
          <p className="text-white/85">{hero.text}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={hero.ctaHref} className="btn bg-white text-brand-solid hover:bg-white/90">
              {hero.ctaLabel}
            </Link>
            <Link href="/track" className="btn border border-white/40 text-white hover:bg-white/10">
              {t(locale, 'nav.track')}
            </Link>
          </div>
        </div>

        {heroImages.length ? (
          <div aria-hidden className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 items-center xl:flex">
            {heroImages.map((p, i) => (
              <img
                key={p.handle}
                src={p.image}
                alt=""
                width={240}
                height={240}
                className={[
                  'rounded-3xl bg-white p-4 shadow-xl ring-1 ring-black/5 object-contain',
                  i === 0 ? 'h-44 w-44 -rotate-6' : i === 1 ? 'ml-[-1.75rem] h-52 w-52 rotate-2' : 'ml-[-1.75rem] h-36 w-36 rotate-6',
                ].join(' ')}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">{t(locale, 'home.byCategory')}</h2>
        <CategoryTiles categories={categories} locale={locale} />
      </section>

      {deals.length ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">{t(locale, 'home.deals')}</h2>
            <Link href="/shop?deals=1" className="text-sm font-semibold text-brand hover:underline">
              {t(locale, 'home.seeDeals')} →
            </Link>
          </div>
          <ProductGrid products={deals} locale={locale} market={market} />
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{t(locale, 'home.featured')}</h2>
          <FreeDeliveryNote locale={locale} market={market} note={hero.note} />
        </div>
        <ProductGrid products={featured} locale={locale} market={market} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{t(locale, 'home.allProducts')}</h2>
          <Link href="/shop" className="text-sm font-semibold text-brand hover:underline">
            {t(locale, 'cart.continue')} →
          </Link>
        </div>
        <ProductGrid products={latest} locale={locale} market={market} />
      </section>
    </div>
  );
}
