'use client';

import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { useSavedHandles } from '@/lib/saved';
import { usePricedHandles } from '@/lib/priced-handles';
import { ProductGrid } from '@/components/shop-ui';

export function SavedView({ locale }: { locale: Locale }) {
  const handles = useSavedHandles();
  const state = usePricedHandles(handles);
  const key = handles.join(',');

  if (!state || state.key !== key) return <p className="text-sm text-muted">{t(locale, 'common.loading')}</p>;
  if (!state.products.length) return <p className="card p-8 text-center text-muted">{t(locale, 'saved.empty')}</p>;
  return <ProductGrid products={state.products} locale={locale} />;
}
