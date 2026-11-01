import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { t } from '@/lib/i18n';
import { getCategories, getCategory, getProducts, localizedName, type SortKey } from '@/lib/catalog';
import { OG_IMAGE, breadcrumbJsonLd, clampText } from '@/lib/seo';
import { Filters, ProductGrid } from '@/components/shop-ui';
import { JsonLd } from '@/components/json-ld';

const SORTS: SortKey[] = ['name', 'price-asc', 'price-desc', 'newest', 'rating'];

type Query = { sort?: string; q?: string; deals?: string; minRating?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const [category, products] = await Promise.all([getCategory(handle), getProducts({ category: handle })]);
  if (!category) return { title: 'Category not found', robots: { index: false } };

  const path = `/category/${category.handle}`;
  const description = clampText(
    `Shop ${products.length} ${category.name.toLowerCase()} products on CityMarket — everyday essentials from trusted vendors, delivered to your door.`,
  );
  const filtered = Boolean(query.q || query.sort || query.deals === '1' || query.minRating);

  return {
    title: category.name,
    description,
    alternates: { canonical: path },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: 'website', siteName: 'CityMarket', url: path, title: category.name, description, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: category.name, description, images: [OG_IMAGE.url] },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Query>;
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
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: category.name, path: `/category/${category.handle}` },
        ])}
      />
      <div className="mb-6 flex items-center gap-4">
        <img src={category.image} alt={localizedName(category, locale)} width={72} height={72} className="h-16 w-16 object-contain" />
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
