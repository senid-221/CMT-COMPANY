import { getLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import type { SortKey } from '@/lib/catalog';
import { getCategories, getProducts } from '@/lib/catalog';
import { Filters, ProductGrid } from '@/components/shop-ui';

const SORTS: SortKey[] = ['name', 'price-asc', 'price-desc', 'newest', 'rating'];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; deals?: string; minRating?: string }>;
}) {
  const locale = await getLocale();
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
      <ProductGrid products={products} locale={locale} />
    </div>
  );
}
