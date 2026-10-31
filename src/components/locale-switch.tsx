'use client';

import { useState } from 'react';
import { LOCALES, LOCALE_COOKIE, type Locale } from '@/lib/i18n';

export function LocaleSwitch({ locale }: { locale: Locale }) {
  const [busy, setBusy] = useState(false);

  function pick(next: Locale) {
    if (next === locale || busy) return;
    setBusy(true);
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-line p-1 max-[399px]:gap-0.5 max-[399px]:p-0.5" role="group" aria-label="Language">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => pick(code)}
          aria-pressed={code === locale}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition max-[399px]:px-2 max-[399px]:py-0.5 max-[399px]:text-[11px] ${
            code === locale ? 'bg-brand text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
