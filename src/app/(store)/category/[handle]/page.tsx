import { notFound } from 'next/navigation';
import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { t } from '@/lib/i18n';
import { getCategories, getCategory, getProducts, localizedName, type SortKey } from '@/lib/catalog';
import { Filters, ProductGrid } from '@/components/shop-ui';

const SORTS: SortKey[] = ['name', 'price-asc', 'price-desc', 'newest', 'rating'];

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ sort?: string; q?: string; deals?: string; minRating?: string }>;
}) {
  const [{ handle }, params2] = await Promise.all([params, searchParams]);
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  const category = await getCategory(handle);
  if (!category) notFound();

  const sort = (SORTS as string[]).includes(params2.sort ?? '') ? (params2.sort as SortKey) : 'name';
  const q = (params2.q ?? '').trim();
  const deals = params2.deals === '1';
  const minRating = [3, 4].includes(Number(params2.minRating)) ? Number(params2.minRating) : 0;

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ category: handle, sort, q: q || undefined, deals, minRating }),
  ]);

  return (
    <div className="shell py-8">
      <div className="mb-6 flex items-center gap-4">
        <img src={category.image} alt="" width={72} height={72} className="h-16 w-16 object-contain" />
        <div>
          <h1 className="font-display text-2xl font-bold">{localizedName(category, locale)}</h1>
          <p className="text-sm text-muted">{t(locale, 'cart.items', { n: products.length })}</p>
        </div>
      </div>

      <Filters
        locale={locale}
        action={`/category/${handle}`}
        query={q}
        activeCategory={handle}
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
