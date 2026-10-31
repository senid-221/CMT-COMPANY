import { cookies, headers } from 'next/headers';
import {
  DEFAULT_MARKET,
  MARKET_COOKIE,
  MARKET_DEFS,
  marketCodeFromCountry,
  marketDef,
  type Currency,
  type Market,
  type MarketDef,
} from '@/lib/markets';
import type { PaymentMethod } from '@/lib/payment-methods';

export type { Currency, Market, MarketDef } from '@/lib/markets';
export { CURRENCIES, DEFAULT_MARKET, MARKET_COOKIE, MARKET_DEFS, isCurrency, marketCodeFromCountry, marketDef } from '@/lib/markets';

const RATE_VARS: Record<Exclude<Currency, 'USD'>, string> = {
  RWF: 'PAY_RWF_PER_USD',
  XOF: 'PAY_XOF_PER_USD',
};

/** Local currency units per US dollar. USD is 1; an unset or absurd rate returns 0. */
export function ratePerUsd(currency: Currency): number {
  if (currency === 'USD') return 1;
  const raw = Number(process.env[RATE_VARS[currency]] ?? '');
  return Number.isFinite(raw) && raw >= 100 ? raw : 0;
}

export type BankDetails = { bank: string; account: string; holder: string };

/**
 * Bank transfer is a manual rail: Flutterwave has no inbound bank product for Rwanda or
 * Senegal, so it only exists once the store publishes the account to transfer to.
 */
export function bankDetails(): BankDetails | null {
  const bank = (process.env.PAY_BANK_NAME ?? '').trim();
  const account = (process.env.PAY_BANK_ACCOUNT ?? '').trim();
  const holder = (process.env.PAY_BANK_HOLDER ?? '').trim();
  if (!bank || !account || !holder) return null;
  return { bank, account, holder };
}

function toMarket(def: MarketDef): Market {
  const ratePerUsdValue = ratePerUsd(def.currency);
  const usable = def.currency === 'USD' || ratePerUsdValue > 0;
  const methods = def.methods.filter((method) => {
    if (method === 'bank') return bankDetails() !== null;
    return usable;
  });
  return { ...def, methods, ratePerUsd: usable ? ratePerUsdValue : 0 };
}

export function resolveMarket(value: unknown): Market {
  const def = marketDef(value);
  if (def) {
    const market = toMarket(def);
    if (market.ratePerUsd > 0) return market;
  }
  return toMarket(marketDef(DEFAULT_MARKET)!);
}

/** The shopper's pick wins; otherwise a country header from the edge, otherwise international. */
export async function getMarket(): Promise<Market> {
  const store = await cookies();
  const picked = store.get(MARKET_COOKIE)?.value;
  if (marketDef(picked)) return resolveMarket(picked);
  const sent = await headers();
  for (const name of ['x-geo-country', 'cf-ipcountry', 'x-country-code', 'x-forwarded-country']) {
    const code = marketCodeFromCountry(sent.get(name));
    if (code) return resolveMarket(code);
  }
  return resolveMarket(DEFAULT_MARKET);
}

/** Markets the switcher can offer: only those whose prices we can actually show. */
export function availableMarkets(): Market[] {
  return MARKET_DEFS.map(toMarket).filter((market) => market.ratePerUsd > 0);
}

export function marketMethods(market: Market): PaymentMethod[] {
  return market.methods;
}
