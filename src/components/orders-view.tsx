'use client';

import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';
import { statusKey } from '@/lib/order-labels';
import { formatMoney } from '@/lib/money';
import { useOrderRefs, useOrderStatuses } from '@/lib/local-orders';

export function OrdersView({ locale }: { locale: Locale }) {
  const refs = useOrderRefs();
  const key = refs.map((r) => r.number).join(',');
  const state = useOrderStatuses(key);

  if (!state || state.key !== key) return <p className="text-sm text-muted">{t(locale, 'common.loading')}</p>;

  if (!state.orders.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted">{t(locale, 'orders.empty')}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">
            {t(locale, 'orders.start')}
          </Link>
          <Link href="/track" className="btn btn-ghost">
            {t(locale, 'nav.track')}
          </Link>
        </div>
      </div>
    );
  }

  const date = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-3">
      {state.orders.map((order) => (
        <Link key={order.number} href={`/order/${order.number}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-brand">
          <div className="min-w-0">
            <p className="font-display font-bold">{order.number}</p>
            <p className="text-sm text-muted">
              {date.format(new Date(order.placedAt))} · {t(locale, 'cart.items', { n: order.itemCount })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">{t(locale, statusKey(order.status))}</span>
            <span className="font-display font-bold text-brand">{formatMoney(order.totalCents, locale)}</span>
          </div>
        </Link>
      ))}
      <p className="pt-2 text-sm">
        <Link href="/track" className="font-semibold text-brand hover:underline">
          {t(locale, 'orders.track')}
        </Link>
      </p>
    </div>
  );
}
