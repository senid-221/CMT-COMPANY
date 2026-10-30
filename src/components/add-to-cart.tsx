'use client';

import { addQty, useCartLines, qtyOf } from '@/lib/cart';
import { t, type Locale } from '@/lib/i18n';
import { CartIcon } from '@/components/icons';

export function AddToCart({ handle, locale, compact }: { handle: string; locale: Locale; compact?: boolean }) {
  const lines = useCartLines();
  const qty = qtyOf(lines, handle);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => addQty(handle, 1)}
        aria-label={t(locale, 'product.addToCart')}
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-action text-action-fg transition hover:bg-brand"
      >
        <CartIcon size={18} />
        {qty > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-[11px] font-bold leading-none text-lime-ink">
            {qty}
          </span>
        ) : null}
      </button>
    );
  }

  if (qty > 0) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-surface p-1">
        <button
          type="button"
          onClick={() => addQty(handle, -1)}
          aria-label={t(locale, 'cart.decrease')}
          className="grid h-8 w-8 place-items-center rounded-full border border-line text-lg leading-none hover:bg-hover"
        >
          −
        </button>
        <span className="min-w-6 text-center font-display text-sm font-bold">{qty}</span>
        <button
          type="button"
          onClick={() => addQty(handle, 1)}
          aria-label={t(locale, 'cart.increase')}
          className="grid h-8 w-8 place-items-center rounded-full bg-brand text-lg leading-none text-white hover:bg-brand-dark"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => addQty(handle, 1)}
      className="btn btn-primary"
    >
      {t(locale, 'product.addToCart')}
    </button>
  );
}
