import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';

export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.3 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function GoogleButton({ locale, enabled = false, next = '/account' }: { locale: Locale; enabled?: boolean; next?: string }) {
  const shape =
    'inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm';

  if (!enabled) {
    return (
      <div className="space-y-1.5">
        <button type="button" disabled aria-describedby="google-availability" className={`${shape} cursor-not-allowed opacity-70`}>
          <GoogleMark />
          {t(locale, 'auth.google')}
        </button>
        <p id="google-availability" className="text-center text-[11px] text-slate-500">
          {t(locale, 'auth.googleSoon')}
        </p>
      </div>
    );
  }

  return (
    <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className={`${shape} transition hover:bg-slate-50`}>
      <GoogleMark />
      {t(locale, 'auth.google')}
    </a>
  );
}
