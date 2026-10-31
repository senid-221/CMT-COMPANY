import Link from 'next/link';
import type { ProductRow } from '@/lib/catalog';
import { localizedName } from '@/lib/catalog';
import { formatMoney } from '@/lib/money';
import type { Market } from '@/lib/markets';
import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { AddToCart } from '@/components/add-to-cart';
import { SaveButton } from '@/components/save-button';

export function ProductCard({ product, locale, market }: { product: ProductRow; locale: Locale; market: Market }) {
  const discount = product.compareAtCents ? Math.round((1 - product.priceCents / product.compareAtCents) * 100) : 0;

  return (
    <article className="card flex h-full flex-col overflow-hidden transition hover:shadow-lg">
      <Link href={`/product/${product.handle}`} className="relative block bg-surface-alt p-3">
        {discount > 0 ? (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">-{discount}%</span>
        ) : null}
        <img
          src={product.image}
          alt={localizedName(product, locale)}
          width={220}
          height={220}
          loading="lazy"
          className="mx-auto aspect-square w-full max-w-[190px] object-contain"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={`/product/${product.handle}`} className="line-clamp-2 min-h-[41px] font-display text-[15px] font-semibold leading-snug hover:text-brand">
          {localizedName(product, locale)}
        </Link>
        <p className="truncate text-xs text-muted">
          {product.rating ? (
            <>
              <span className="text-amber">★</span> {product.rating.toFixed(1)} ({product.ratingCount}) ·{' '}
            </>
          ) : null}
          {product.unit}
        </p>
        <div className="mt-auto flex h-[52px] items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="whitespace-nowrap font-display text-base font-bold text-brand">{formatMoney(product.priceCents, locale, market)}</span>
            <span className="h-3 whitespace-nowrap text-[11px] text-muted">
              {product.compareAtCents ? <s>{formatMoney(product.compareAtCents, locale, market)}</s> : <span aria-hidden="true">&nbsp;</span>}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SaveButton handle={product.handle} locale={locale} />
            <AddToCart handle={product.handle} locale={locale} compact image={product.image} />
          </div>
        </div>
      </div>
    </article>
  );
}
