import type { Metadata } from 'next';
import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { t } from '@/lib/i18n';
import type { SortKey } from '@/lib/catalog';
import { getCategories, getProducts } from '@/lib/catalog';
import { OG_IMAGE } from '@/lib/seo';
import { Filters, ProductGrid } from '@/components/shop-ui';

const SORTS: SortKey[] = ['name', 'price-asc', 'price-desc', 'newest', 'rating'];

type Query = { q?: string; category?: string; sort?: string; deals?: string; minRating?: string };

const SHOP_DESCRIPTION =
  'Browse the full CityMarket catalogue — groceries, beauty, drinks, fashion and electronics at clear prices, delivered to your door.';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }): Promise<Metadata> {
  const query = await searchParams;
  const title = query.deals === '1' ? 'Deals' : query.q ? `Search results` : 'Shop all products';
  // Sorted and filtered views are crawl traps; only the plain catalogue is indexable.
  const filtered = Boolean(query.q || query.category || query.sort || query.deals === '1' || query.minRating);

  return {
    title,
    description: SHOP_DESCRIPTION,
    alternates: { canonical: '/shop' },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: 'website', siteName: 'CityMarket', url: '/shop', title, description: SHOP_DESCRIPTION, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description: SHOP_DESCRIPTION, images: [OG_IMAGE.url] },
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const category = (params.category ?? '').trim();
  const sort = (SORTS as string[]).includes(params.sort ?? '') ? (params.sort as SortKey) : 'name';
  const deals = params.deals === '1';
  const minRating = [3, 4].includes(Number(params.minRating)) ? Number(params.minRating) : 0;

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ q, category, sort, deals, minRating }),
  ]);

  return (
    <div className="shell py-8">
      <h1 className="mb-1 font-display text-2xl font-bold">{deals ? t(locale, 'home.deals') : q ? t(locale, 'search.results') : t(locale, 'home.allProducts')}</h1>
      <p className="mb-6 text-sm text-muted">{q ? `“${q}”` : t(locale, 'home.heroText')}</p>
      <Filters
        locale={locale}
        action="/shop"
        query={q}
        activeCategory={category}
        sort={sort}
        categories={categories}
        total={products.length}
        deals={deals}
        minRating={minRating}
      />
      <ProductGrid products={products} locale={locale} market={market} />
    </div>
  );
}
