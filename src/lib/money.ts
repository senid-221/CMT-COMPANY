const formatters: Record<'en' | 'fr', Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  fr: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }),
};

export function formatMoney(cents: number, locale: 'en' | 'fr' = 'en') {
  const safe = Math.max(0, Math.round(cents));
  return formatters[locale].format(safe / 100);
}

export function parseMoney(input: unknown): number {
  const n = Number(String(input ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const xofFormatters: Record<'en' | 'fr', Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }),
  fr: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }),
};

export function formatXof(amount: number, locale: 'en' | 'fr' = 'en') {
  return `${xofFormatters[locale].format(Math.max(0, Math.round(amount)))} F CFA`;
}
