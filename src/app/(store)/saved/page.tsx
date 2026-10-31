import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { t } from '@/lib/i18n';
import { SavedView } from '@/components/saved-view';

export const metadata = { title: 'Saved items' };

export default async function SavedPage() {
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  return (
    <div className="shell py-8">
      <h1 className="mb-6 font-display text-2xl font-bold">{t(locale, 'nav.saved')}</h1>
      <SavedView locale={locale} market={market} />
    </div>
  );
}
