'use client';

import Link from 'next/link';
import { localizedName } from '@/lib/catalog';
import { t, type Locale } from '@/lib/i18n';
import { statusKey } from '@/lib/order-labels';
import { formatMoney } from '@/lib/money';
import { useOrderRefs, useOrderStatuses } from '@/lib/local-orders';
import { usePricedHandles } from '@/lib/priced-handles';
import { useSavedHandles } from '@/lib/saved';

const LOW_STOCK = 10;

export function NotificationsView({ locale }: { locale: Locale }) {
  const refs = useOrderRefs();
  const saved = useSavedHandles();
  const orderKey = refs.map((r) => r.number).join(',');
  const savedKey = saved.join(',');
  const orders = useOrderStatuses(orderKey);
  const products = usePricedHandles(saved);

  if (!orders || orders.key !== orderKey || !products || products.key !== savedKey)
    return <p className="text-sm text-muted">{t(locale, 'common.loading')}</p>;

  const date = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  if (!orders.orders.length && !products.products.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted">{t(locale, 'notif.empty')}</p>
        <Link href="/shop" className="btn btn-primary mt-5">
          {t(locale, 'orders.start')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {orders.orders.length ? (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">{t(locale, 'notif.orders')}</h2>
          <div className="space-y-3">
            {orders.orders.map((order) => (
              <Link key={order.number} href={`/order/${order.number}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-brand">
                <div className="min-w-0">
                  <p className="font-display font-bold">{order.number}</p>
                  <p className="text-sm text-muted">{date.format(new Date(order.placedAt))} · {t(locale, statusKey(order.status))}</p>
                </div>
                <span className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{formatMoney(order.totalCents, locale)}</span>
                  <span className="font-semibold text-brand">{t(locale, 'notif.open')}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {products.products.length ? (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">{t(locale, 'notif.saved')}</h2>
          <ul className="card divide-y divide-line">
            {products.products.map((product) => (
              <li key={product.handle} className="flex items-center gap-3 p-3">
                <img src={product.image} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-xl bg-surface-alt object-contain p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{localizedName(product, locale)}</p>
                  <p className={`text-sm ${product.stock === 0 ? 'text-danger' : product.stock <= LOW_STOCK ? 'text-warning' : 'text-success'}`}>
                    {product.stock === 0
                      ? t(locale, 'notif.soldOut')
                      : product.stock <= LOW_STOCK
                        ? t(locale, 'notif.low', { n: product.stock })
                        : t(locale, 'notif.ok')}
                  </p>
                </div>
                <span className="whitespace-nowrap font-display text-sm font-bold text-brand">{formatMoney(product.priceCents, locale)}</span>
                <Link href={`/product/${product.handle}`} className="text-sm font-semibold text-brand hover:underline">
                  {t(locale, 'notif.open')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
