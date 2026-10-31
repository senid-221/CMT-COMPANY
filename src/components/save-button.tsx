'use client';

import { toggleSaved, useSavedHandles } from '@/lib/saved';
import { t, type Locale } from '@/lib/i18n';
import { BookmarkIcon } from '@/components/icons';

export function SaveButton({ handle, locale }: { handle: string; locale: Locale }) {
  const saved = useSavedHandles();
  const isSaved = saved.includes(handle);

  return (
    <button
      type="button"
      onClick={() => toggleSaved(handle)}
      aria-pressed={isSaved}
      aria-label={isSaved ? t(locale, 'product.saved') : t(locale, 'product.save')}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full shadow-sm transition active:scale-90 ${
        isSaved ? 'bg-brand text-white' : 'bg-action text-action-fg hover:bg-brand'
      }`}
    >
      <BookmarkIcon size={15} filled={isSaved} />
    </button>
  );
}
