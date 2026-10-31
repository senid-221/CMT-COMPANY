import Link from 'next/link';
import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { t, type Locale } from '@/lib/i18n';
import { getCategories, getDeals, getFeatured, getProducts, getProductsByHandles } from '@/lib/catalog';
import { getContent, pickText } from '@/lib/content';
import { FREE_DELIVERY_FROM_CENTS } from '@/lib/pricing';
import { formatMoney } from '@/lib/money';
import { CategoryTiles, FreeDeliveryNote, ProductGrid, ProductRail } from '@/components/shop-ui';
import { HeroSlider, type HeroSlide } from '@/components/hero-slider';
import { CouponAds } from '@/components/coupon-ads';
import { getActiveCoupons } from '@/lib/coupons';

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

const images = (products: { image: string; handle: string }[]) =>
  products.map((p) => ({ src: p.image, alt: '' }));

export default async function HomePage() {
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  const hero = await heroCopy(locale);
  const [categories, featured, latest, deals, coupons] = await Promise.all([
    getCategories(),
    hero.featuredHandles.length ? getProductsByHandles(hero.featuredHandles) : getFeatured(),
    getProducts({ sort: 'name', take: 12 }),
    getDeals(10),
    getActiveCoupons(market.code),
  ]);

  const heroPool = featured.length ? featured : latest;

  const slides: HeroSlide[] = [
    {
      title: hero.title,
      text: hero.text,
      ctaLabel: hero.ctaLabel,
      ctaHref: hero.ctaHref,
      images: images(heroPool.slice(0, 3)),
    },
  ];

  if (deals.length) {
    slides.push({
      title: t(locale, 'home.deals'),
      text: t(locale, 'home.dealsSlideText'),
      ctaLabel: t(locale, 'home.seeDeals'),
      ctaHref: '/shop?deals=1',
      images: images(deals.slice(0, 3)),
    });
  }

  slides.push({
    title: t(locale, 'home.deliverySlideTitle', { amount: formatMoney(FREE_DELIVERY_FROM_CENTS, locale, market) }),
    text: hero.note?.trim() || t(locale, 'home.deliverySlideText'),
    ctaLabel: t(locale, 'home.shopNow'),
    ctaHref: '/shop',
    images: images(latest.slice(0, 3)),
  });

  const rail = {
    prevLabel: t(locale, 'rail.prev'),
    nextLabel: t(locale, 'rail.next'),
    locale,
    market,
  };

  return (
    <div className="shell space-y-10 py-8">
      <HeroSlider
        slides={slides}
        labels={slides.map((_, i) => t(locale, 'rail.slide', { n: i + 1, total: slides.length }))}
      />

      {coupons.length ? <CouponAds coupons={coupons} locale={locale} market={market} /> : null}

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
          <ProductRail products={deals} autoAdvance {...rail} />
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{t(locale, 'home.featured')}</h2>
          <FreeDeliveryNote locale={locale} market={market} note={hero.note} />
        </div>
        <ProductRail products={featured} {...rail} />
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
