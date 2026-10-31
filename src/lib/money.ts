import type { Currency } from '@/lib/markets';

/** Everything a storefront needs to show US-cent amounts in one shopper's currency. */
export type PriceContext = { currency: Currency; ratePerUsd: number };

export const USD_PRICES: PriceContext = { currency: 'USD', ratePerUsd: 1 };

const formatters: Record<Currency, Record<'en' | 'fr', Intl.NumberFormat>> = {
  USD: {
    en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    fr: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }),
  },
  RWF: {
    en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }),
    fr: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }),
  },
  XOF: {
    en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }),
    fr: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }),
  },
};

/** Whole local-currency units for a US-cent amount; 0 for USD, which is already cents-based. */
export function toUnits(cents: number, prices: PriceContext) {
  if (prices.currency === 'USD' || prices.ratePerUsd <= 0) return 0;
  return Math.max(0, Math.round((cents / 100) * prices.ratePerUsd));
}

/** An amount that is already expressed in `currency` units (no conversion applied). */
export function formatUnits(amount: number, locale: 'en' | 'fr' = 'en', currency: Currency = 'USD') {
  const safe = Math.max(0, Math.round(amount));
  if (currency === 'USD') return formatters.USD[locale].format(safe / 100);
  return formatters[currency][locale].format(safe);
}

/** `cents` is always US cents; `prices` decides how it is shown to this shopper. */
export function formatMoney(cents: number, locale: 'en' | 'fr' = 'en', prices: PriceContext = USD_PRICES) {
  const safe = Math.max(0, Math.round(cents));
  if (prices.currency === 'USD') return formatters.USD[locale].format(safe / 100);
  const units = toUnits(safe, prices);
  return formatters[prices.currency][locale].format(units || safe);
}

export function parseMoney(input: unknown): number {
  const n = Number(String(input ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
