import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import type { Market } from '@/lib/markets';
import { FREE_DELIVERY_FROM_CENTS } from '@/lib/pricing';
import { localizedName, type CategoryRow, type ProductRow, type SortKey } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
import { Rail } from '@/components/rail';

export function ProductRail({
  products,
  locale,
  market,
  prevLabel,
  nextLabel,
  autoAdvance = false,
}: {
  products: ProductRow[];
  locale: Locale;
  market: Market;
  prevLabel: string;
  nextLabel: string;
  autoAdvance?: boolean;
}) {
  if (!products.length) return null;
  return (
    <Rail prevLabel={prevLabel} nextLabel={nextLabel} autoAdvance={autoAdvance}>
      {products.map((p) => (
        <div key={p.handle} role="listitem" className="w-[166px] sm:w-[195px] lg:w-[239px]">
          <ProductCard product={p} locale={locale} market={market} />
        </div>
      ))}
    </Rail>
  );
}

export function ProductGrid({ products, locale, market }: { products: ProductRow[]; locale: Locale; market: Market }) {
  if (!products.length) {
    return (
      <div className="card p-8 text-center text-muted">
        <p>{t(locale, 'search.empty')}</p>
        <Link href="/shop" className="btn btn-ghost mt-4">
          {t(locale, 'cart.continue')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={`${p.handle}`} product={p} locale={locale} market={market} />
      ))}
    </div>
  );
}

export function CategoryTiles({ categories, locale }: { categories: CategoryRow[]; locale: Locale }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
      {categories.map((c) => (
        <Link key={c.handle} href={`/category/${c.handle}`} className="card group flex flex-col items-center gap-2 p-3 text-center hover:border-brand">
          <img src={c.image} alt="" width={64} height={64} className="h-14 w-14 object-contain" />
          <span className="text-xs font-semibold leading-tight group-hover:text-brand">{localizedName(c, locale)}</span>
        </Link>
      ))}
    </div>
  );
}

export function Filters({
  locale,
  action,
  query,
  activeCategory,
  sort,
  categories,
  total,
  deals = false,
  minRating = 0,
}: {
  locale: Locale;
  action: string;
  query: string;
  activeCategory: string;
  sort: SortKey;
  categories: CategoryRow[];
  total: number;
  deals?: boolean;
  minRating?: number;
}) {
  return (
    <form method="get" action={action} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-52 flex-1">
        <label className="label" htmlFor="q">
          {t(locale, 'search.placeholder')}
        </label>
        <input id="q" name="q" type="search" defaultValue={query} className="field" />
      </div>
      <div className="min-w-40">
        <label className="label" htmlFor="category">
          {t(locale, 'filter.category')}
        </label>
        <select id="category" name="category" defaultValue={activeCategory} className="field">
          <option value="">{t(locale, 'filter.all')}</option>
          {categories.map((c) => (
            <option key={c.handle} value={c.handle}>
              {localizedName(c, locale)}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-40">
        <label className="label" htmlFor="minRating">
          {t(locale, 'filter.minRating')}
        </label>
        <select id="minRating" name="minRating" defaultValue={minRating ? String(minRating) : ''} className="field">
          <option value="">{t(locale, 'filter.anyRating')}</option>
          <option value="4">{t(locale, 'filter.ratingValue', { n: 4 })}</option>
          <option value="3">{t(locale, 'filter.ratingValue', { n: 3 })}</option>
        </select>
      </div>
      <div className="min-w-40">
        <label className="label" htmlFor="sort">
          {t(locale, 'filter.sort')}
        </label>
        <select id="sort" name="sort" defaultValue={sort} className="field">
          <option value="name">{t(locale, 'filter.nameAsc')}</option>
          <option value="price-asc">{t(locale, 'filter.priceAsc')}</option>
          <option value="price-desc">{t(locale, 'filter.priceDesc')}</option>
          <option value="newest">{t(locale, 'filter.newest')}</option>
          <option value="rating">{t(locale, 'filter.ratingSort')}</option>
        </select>
      </div>
      <label className="flex h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium">
        <input type="checkbox" name="deals" value="1" defaultChecked={deals} className="h-4 w-4" />
        {t(locale, 'filter.dealsOnly')}
      </label>
      <button type="submit" className="btn btn-primary px-6">
        {t(locale, 'search.button')}
      </button>
      <p className="text-sm text-muted">{t(locale, 'cart.items', { n: total })}</p>
    </form>
  );
}

export function FreeDeliveryNote({ locale, market, note }: { locale: Locale; market: Market; note?: string }) {
  return (
    <p className="rounded-full bg-surface px-4 py-2 text-sm text-ink/70">
      {note?.trim() || t(locale, 'cart.freeDelivery', { amount: formatMoney(FREE_DELIVERY_FROM_CENTS, locale, market) })}
    </p>
  );
}
