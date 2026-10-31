import type { Locale } from '@/lib/i18n';
import type { OnlinePaymentMethod, PaymentMethod } from '@/lib/payment-methods';

export const CURRENCIES = ['USD', 'RWF', 'XOF'] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

export const MARKET_COOKIE = 'cmb_market';
export const DEFAULT_MARKET = 'INT';

export type MarketDef = {
  code: string;
  currency: Currency;
  phoneCode: string | null;
  /** Cash on delivery and card are offered everywhere; the rest are local rails. */
  methods: PaymentMethod[];
  names: Record<Locale, string>;
};

/** A market the shopper can be served in: its definition plus the FX rate it prices at. */
export type Market = MarketDef & {
  /** Local currency units per US dollar; USD is 1, and 0 means the market is not usable. */
  ratePerUsd: number;
};

/**
 * Card and cash stay available in every market on purpose: they are the rails that work
 * regardless of where the shopper is, so a misresolved country never leaves the cart
 * without a way to pay.
 */
const UNIVERSAL: PaymentMethod[] = ['cod', 'card'];

export const MARKET_DEFS: MarketDef[] = [
  {
    code: 'RW',
    currency: 'RWF',
    phoneCode: '+250',
    methods: [...UNIVERSAL, 'mtn', 'bank'],
    names: { en: 'Rwanda', fr: 'Rwanda' },
  },
  {
    code: 'SN',
    currency: 'XOF',
    phoneCode: '+221',
    methods: [...UNIVERSAL, 'orange', 'wave', 'bank'],
    names: { en: 'Senegal', fr: 'Sénégal' },
  },
  {
    code: 'INT',
    currency: 'USD',
    phoneCode: null,
    methods: [...UNIVERSAL],
    names: { en: 'International', fr: 'International' },
  },
];

export function marketDef(code: unknown): MarketDef | null {
  if (typeof code !== 'string') return null;
  const upper = code.trim().toUpperCase();
  return MARKET_DEFS.find((def) => def.code === upper) ?? null;
}

/** Maps an ISO country code from any geo source onto a configured market code, or null. */
export function marketCodeFromCountry(country: unknown): string | null {
  if (typeof country !== 'string') return null;
  const code = country.trim().toUpperCase();
  if (code === 'RW') return 'RW';
  if (['SN', 'CI', 'ML', 'BF', 'TG', 'BJ', 'NE', 'GW'].includes(code)) return 'SN';
  if (code.length === 2 && code !== 'XX') return 'INT';
  return null;
}

/** What checkout shows: the country's rails that the gateway is also live on. Cash never depends on a gateway. */
export function offeredRails(methods: PaymentMethod[], rails: Record<OnlinePaymentMethod, boolean>): PaymentMethod[] {
  return methods.filter((method) => method === 'cod' || method === 'bank' || rails[method]);
}
