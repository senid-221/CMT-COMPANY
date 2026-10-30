import { getLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { OrdersView } from '@/components/orders-view';

export const metadata = { title: 'My orders' };

export default async function OrdersPage() {
  const locale = await getLocale();
  return (
    <div className="shell max-w-3xl py-8">
      <h1 className="font-display text-2xl font-bold">{t(locale, 'orders.title')}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{t(locale, 'orders.intro')}</p>
      <OrdersView locale={locale} />
    </div>
  );
}
