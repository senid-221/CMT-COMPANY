import Link from 'next/link';
import { getLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { statusKey } from '@/lib/order-labels';
import { formatMoney } from '@/lib/money';
import { getMarket } from '@/lib/market';
import { findOrdersByPhone } from '@/lib/orders';

export const metadata = { title: 'Track an order' };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone } = await searchParams;
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  const clean = (phone ?? '').trim();
  const orders = clean.length >= 8 ? await findOrdersByPhone(clean) : [];

  return (
    <div className="shell max-w-3xl py-8">
      <h1 className="font-display text-2xl font-bold">{t(locale, 'track.title')}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{t(locale, 'track.intro')}</p>

      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-52 flex-1">
          <label className="label" htmlFor="phone">
            {t(locale, 'checkout.phone')}
          </label>
          <input id="phone" name="phone" type="tel" required defaultValue={clean} className="field" placeholder="+250 7X XXX XXXX" />
        </div>
        <button type="submit" className="btn btn-primary px-6">
          {t(locale, 'track.find')}
        </button>
      </form>

      {clean.length >= 8 && orders.length === 0 ? <p className="card p-6 text-center text-muted">{t(locale, 'order.empty')}</p> : null}

      <div className="space-y-3">
        {orders.map((order) => (
          <Link key={order.id} href={`/order/${order.number}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-brand">
            <div>
              <p className="font-display font-bold">{order.number}</p>
              <p className="text-sm text-muted">
                {new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(order.placedAt)} ·{' '}
                {t(locale, statusKey(order.status))}
              </p>
            </div>
            <span className="font-display font-bold text-brand">{formatMoney(order.totalCents, locale, market)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
