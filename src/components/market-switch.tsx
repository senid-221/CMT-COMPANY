'use client';

import { useEffect, useRef, useState } from 'react';
import { t, type Locale } from '@/lib/i18n';
import { MARKET_COOKIE, marketCodeFromCountry, type Market } from '@/lib/markets';

const GEO_URL = 'https://get.geojs.io/v1/ip/country.json';

function hasMarketCookie() {
  return document.cookie.split(';').some((entry) => entry.trim().startsWith(`${MARKET_COOKIE}=`));
}

function rememberMarket(code: string) {
  document.cookie = `${MARKET_COOKIE}=${code};path=/;max-age=31536000;samesite=lax`;
  window.location.reload();
}

export function MarketSwitch({ locale, market, options }: { locale: Locale; market: Market; options: Market[] }) {
  const [open, setOpen] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Only guessed when the shopper has never chosen: an explicit pick always wins and is never overwritten.
  useEffect(() => {
    if (hasMarketCookie() || options.length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    fetch(GEO_URL, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { country?: string } | null) => {
        const code = marketCodeFromCountry(body?.country);
        if (!code || code === market.code) return;
        if (!options.some((option) => option.code === code)) return;
        setDetected(code);
      })
      .catch(() => {});
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [market.code, options]);

  if (options.length < 2) return null;

  const detectedMarket = detected ? options.find((option) => option.code === detected) : null;

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t(locale, 'market.label')}
        title={`${t(locale, 'market.label')} · ${market.currency}`}
        className="relative grid h-10 w-10 max-[399px]:h-9 max-[399px]:w-9 place-items-center rounded-full text-ink transition hover:bg-hover hover:text-brand"
      >
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 21s-6.5-5.4-6.5-10a6.5 6.5 0 1 1 13 0c0 4.6-6.5 10-6.5 10Z" strokeLinejoin="round" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
        {detected ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" aria-hidden /> : null}
      </button>
      {open ? (
        <div className="card absolute left-0 top-12 z-40 w-56 p-1.5 shadow-lg">
          {detectedMarket ? (
            <div className="mb-1 flex items-center justify-between gap-2 rounded-lg bg-brand/5 px-3 py-2 text-[11px] font-semibold text-brand">
              <span>{t(locale, 'market.detected', { country: detectedMarket.names[locale] })}</span>
              <button
                type="button"
                aria-label={t(locale, 'market.keep', { country: market.names[locale] })}
                onClick={() => rememberMarket(market.code)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted hover:bg-hover hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : null}
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              aria-pressed={option.code === market.code}
              onClick={() => rememberMarket(option.code)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-hover ${
                option.code === market.code ? 'text-brand' : 'hover:text-brand'
              }`}
            >
              <span className="truncate">{option.names[locale]}</span>
              <span className="shrink-0 text-xs uppercase tracking-wide text-muted">{option.currency}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
