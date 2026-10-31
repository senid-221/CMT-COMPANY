'use client';

import { useState } from 'react';
import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import type { Market } from '@/lib/markets';
import type { CouponRow } from '@/lib/coupons';

export function CouponAds({ coupons, locale, market }: { coupons: CouponRow[]; locale: Locale; market: Market }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const dateFormat = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium' });

  /** The ticker loops at -50%, so it needs an even number of passes that together fill the strip. */
  const passes = 2 * Math.max(1, Math.ceil(4 / Math.max(1, coupons.length)));

  async function grab(coupon: CouponRow) {
    setRevealed((current) => ({ ...current, [coupon.id]: true }));
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(coupon.id);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="ticket-strip">
        <div className="marquee">
          {Array.from({ length: passes }, (_, pass) => (
            <div key={pass} className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={pass > 0}>
              {coupons.map((coupon) => (
                <span key={`${pass}-${coupon.id}`} className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-ink">
                  <span className="text-brand">◆</span>
                  {headline(coupon, locale, market)} · {coupon.code}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <h2 className="font-display text-xl font-semibold">{t(locale, 'coupon.title')}</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((coupon, index) => {
          const shown = revealed[coupon.id];
          return (
            <article
              key={coupon.id}
              className="ticket flip-in"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="min-w-0 flex-1 space-y-1 p-4">
                <p className="font-display text-lg font-bold text-brand">{headline(coupon, locale, market)}</p>
                {couponLabel(coupon, locale) ? <p className="text-sm text-ink">{couponLabel(coupon, locale)}</p> : null}
                <p className="text-xs text-muted">
                  {coupon.minSubtotalCents > 0 ? t(locale, 'coupon.minSpend', { amount: formatMoney(coupon.minSubtotalCents, locale, market) }) : null}
                  {coupon.minSubtotalCents > 0 && coupon.endsAt ? ' · ' : ''}
                  {coupon.endsAt ? t(locale, 'coupon.expires', { date: dateFormat.format(coupon.endsAt) }) : null}
                </p>
              </div>

              <div className="ticket-actions">
                {shown ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-3d flip-in"
                    aria-label={t(locale, 'coupon.copy')}
                    onClick={() => void grab(coupon)}
                  >
                    {copied === coupon.id ? `✓ ${t(locale, 'coupon.copied')}` : coupon.code}
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost btn-3d btn-3d-line" onClick={() => void grab(coupon)}>
                    {t(locale, 'coupon.grab')}
                  </button>
                )}
                <Link href="/shop" className="text-xs font-semibold text-brand hover:underline">
                  {t(locale, 'home.shopNow')} →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function headline(coupon: CouponRow, locale: Locale, market: Market) {
  if (coupon.kind === 'amount') {
    return t(locale, 'coupon.offAmount', { amount: formatMoney(coupon.amountCents ?? 0, locale, market) });
  }
  return t(locale, 'coupon.offPercent', { pct: coupon.percent ?? 0 });
}

function couponLabel(coupon: CouponRow, locale: Locale) {
  const value = locale === 'fr' ? coupon.labelFr : coupon.label;
  return (value || '').trim();
}
