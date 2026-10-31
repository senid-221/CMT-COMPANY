import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { t } from '@/lib/i18n';
import { NotificationsView } from '@/components/notifications-view';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  return (
    <div className="shell max-w-3xl py-8">
      <h1 className="font-display text-2xl font-bold">{t(locale, 'notif.title')}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{t(locale, 'notif.intro')}</p>
      <NotificationsView locale={locale} market={market} />
    </div>
  );
}
