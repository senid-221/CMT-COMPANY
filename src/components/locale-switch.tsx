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
    <div className="flex items-center gap-0.5 rounded-full border border-line p-0.5" role="group" aria-label="Language">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => pick(code)}
          aria-pressed={code === locale}
          className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition max-[399px]:px-1 max-[399px]:text-[10px] ${
            code === locale ? 'bg-brand text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
