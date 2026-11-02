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

/**
 * Collapse the many ways a shopper types a number into one stored form. A local number is
 * completed with the market's country code, because the rider and the mobile-money prompt
 * both have to be able to dial it.
 */
export function normalizePhone(raw: string, phoneCode: string | null): string {
  const trimmed = (raw ?? '').trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (!phoneCode) return digits;
  const country = phoneCode.replace(/\D/g, '');
  if (digits.startsWith(`0${country}`)) return `+${digits.slice(1)}`;
  if (digits.startsWith(country)) return `+${digits}`;
  const subscriber = digits.replace(/^0/, '');
  if (subscriber.length >= 7 && subscriber.length <= 10) return `+${country}${subscriber}`;
  return digits;
}

/**
 * Mobile money can only prompt a wallet on the rail's own network, so a number that is not
 * local is a payment that cannot succeed. Caught here instead of at the gateway.
 */
export function walletNumberValid(phone: string, phoneCode: string | null): boolean {
  if (!phoneCode) return true;
  if (!phone.startsWith('+')) return false;
  const country = phoneCode.replace(/\D/g, '');
  const digits = phone.slice(1);
  if (!digits.startsWith(country)) return false;
  return /^[2-9][0-9]{7,9}$/.test(digits.slice(country.length));
}
