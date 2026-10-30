'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { addQty, clearCart, setQty, useCartLines } from '@/lib/cart';
import { formatMoney } from '@/lib/money';
import { FREE_DELIVERY_FROM_CENTS, SLOT_FEE_CENTS, type Slot } from '@/lib/pricing';
import { t, type Locale } from '@/lib/i18n';
import { localizedName, type ProductRow } from '@/lib/catalog';

export type PricedLine = ProductRow & { qty: number };

export function usePricedCart(locale: Locale) {
  const lines = useCartLines();
  const handles = useMemo(() => lines.map((l) => l.handle).join(','), [lines]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!handles) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/cart?handles=${encodeURIComponent(handles)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { lines: ProductRow[] }) => {
        if (cancelled) return;
        setProducts(data.lines ?? []);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handles]);

  const priced: PricedLine[] = useMemo(() => {
    const byHandle = new Map(products.map((p) => [p.handle, p]));
    return lines
      .map((l) => {
        const p = byHandle.get(l.handle);
        return p ? { ...p, qty: l.qty } : null;
      })
      .filter((x): x is PricedLine => Boolean(x));
  }, [lines, products]);

  const subtotalCents = priced.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
  const itemCount = priced.reduce((sum, l) => sum + l.qty, 0);
  const feeFor = (slot: Slot) => (subtotalCents >= FREE_DELIVERY_FROM_CENTS ? 0 : SLOT_FEE_CENTS[slot]);

  return { priced, loading, failed, subtotalCents, itemCount, feeFor, locale, clear: clearCart, change: addQty };
}

export function CartView({ locale }: { locale: Locale }) {
  const { priced, loading, failed, subtotalCents, itemCount, clear } = usePricedCart(locale);

  if (loading && itemCount > 0) {
    return <div className="shell py-16 text-center text-muted">{t(locale, 'cart.title')}…</div>;
  }

  if (!priced.length) {
    return (
      <div className="shell py-16 text-center">
        <h1 className="font-display text-2xl font-bold">{t(locale, 'cart.title')}</h1>
        <p className="mt-2 text-muted">{t(locale, 'cart.empty')}</p>
        <Link href="/shop" className="btn btn-primary mt-6">
          {t(locale, 'cart.continue')}
        </Link>
      </div>
    );
  }

  return (
    <div className="shell grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{t(locale, 'cart.title')}</h1>
          <button type="button" onClick={clear} className="text-sm font-semibold text-danger hover:underline">
            {t(locale, 'cart.clear')}
          </button>
        </div>
        {failed ? <p className="rounded-lg bg-warning/15 px-4 py-3 text-sm">{t(locale, 'cart.loadFailed')}</p> : null}

        {priced.map((line) => (
          <article key={line.handle} className="card flex items-center gap-4 p-3">
            <img src={line.image} alt="" width={72} height={72} className="h-16 w-16 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <Link href={`/product/${line.handle}`} className="font-display font-semibold hover:text-brand">
                {localizedName(line, locale)}
              </Link>
              <p className="text-xs text-muted">
                {line.unit} · {formatMoney(line.priceCents, locale)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => addQty(line.handle, -1)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-lg" aria-label={t(locale, 'cart.decrease')}>
                −
              </button>
              <span className="min-w-6 text-center font-bold">{line.qty}</span>
              <button type="button" onClick={() => addQty(line.handle, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-brand text-lg text-white" aria-label={t(locale, 'cart.increase')}>
                +
              </button>
            </div>
            <div className="w-24 text-right font-display font-bold">{formatMoney(line.priceCents * line.qty, locale)}</div>
            <button type="button" onClick={() => setQty(line.handle, 0)} className="text-xs font-semibold text-danger hover:underline">
              {t(locale, 'cart.remove')}
            </button>
          </article>
        ))}
      </div>

      <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold">{t(locale, 'cart.summary')}</h2>
        <Row label={t(locale, 'cart.items', { n: itemCount })} value={formatMoney(subtotalCents, locale)} />
        <Row
          label={t(locale, 'cart.delivery')}
          value={subtotalCents >= FREE_DELIVERY_FROM_CENTS ? '0' : `${formatMoney(SLOT_FEE_CENTS.today, locale)}`}
        />
        <div className="border-t border-line pt-3">
          <Row label={t(locale, 'cart.total')} value={formatMoney(subtotalCents + (subtotalCents >= FREE_DELIVERY_FROM_CENTS ? 0 : SLOT_FEE_CENTS.today), locale)} bold />
        </div>
        <p className="text-xs text-muted">{t(locale, 'cart.freeDelivery', { amount: formatMoney(FREE_DELIVERY_FROM_CENTS, locale) })}</p>
        <Link href="/checkout" className="btn btn-primary mt-2 w-full">
          {t(locale, 'cart.checkout')}
        </Link>
        <Link href="/shop" className="btn btn-ghost w-full">
          {t(locale, 'cart.continue')}
        </Link>
      </aside>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? 'font-display text-base font-bold' : 'text-ink/80'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
