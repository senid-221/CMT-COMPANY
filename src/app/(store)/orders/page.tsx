import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { t } from '@/lib/i18n';
import { OrdersView } from '@/components/orders-view';

export const metadata = { title: 'My orders', robots: { index: false } };

export default async function OrdersPage() {
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  return (
    <div className="shell max-w-3xl py-8">
      <h1 className="font-display text-2xl font-bold">{t(locale, 'orders.title')}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{t(locale, 'orders.intro')}</p>
      <OrdersView locale={locale} market={market} />
    </div>
  );
}
