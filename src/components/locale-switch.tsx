'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, t, type Locale } from '@/lib/i18n';

export function LocaleSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: Locale = locale === 'en' ? 'fr' : 'en';

  function switchNow() {
    if (pending) return;
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchNow}
      aria-label={next === 'fr' ? t(locale, 'lang.switchToFr') : t(locale, 'lang.switchToEn')}
      title={`${locale.toUpperCase()} → ${next.toUpperCase()}`}
      disabled={pending}
      className="inline-flex h-12 shrink-0 items-center gap-1 rounded-xl bg-surface px-2.5 text-xs font-bold uppercase text-ink transition hover:bg-hover hover:text-brand active:scale-[0.96] disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 9h17M3.5 15h17M12 3a17 17 0 0 1 0 18M12 3a17 17 0 0 0 0 18" />
      </svg>
      {next}
    </button>
  );
}
