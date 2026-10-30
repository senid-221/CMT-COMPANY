import { getLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { SavedView } from '@/components/saved-view';

export const metadata = { title: 'Saved items' };

export default async function SavedPage() {
  const locale = await getLocale();
  return (
    <div className="shell py-8">
      <h1 className="mb-6 font-display text-2xl font-bold">{t(locale, 'nav.saved')}</h1>
      <SavedView locale={locale} />
    </div>
  );
}
