import type { Currency } from './markets';
import type { OnlinePaymentMethod } from './payment-methods';

export type Charge = { currency: Currency; amount: number };
export type Rates = { RWF: number; XOF: number };

/** Flutterwave only accepts each rail in its own currency, so the charge is built per rail. */
export function chargeFor(method: OnlinePaymentMethod, totalCents: number, rates: Rates): Charge {
  if (method === 'card') return { currency: 'USD', amount: Math.max(1, Math.round(totalCents)) };
  const currency: Exclude<Currency, 'USD'> = method === 'mtn' ? 'RWF' : 'XOF';
  return { currency, amount: Math.max(1, Math.round((totalCents / 100) * rates[currency])) };
}

/** Cards are billed in major units (8.48), mobile money in whole local units (11024). */
export function apiAmount(charge: Charge) {
  return charge.currency === 'USD' ? Number((charge.amount / 100).toFixed(2)) : charge.amount;
}

/** Flutterwave's hosted-checkout channel names for each rail. */
export function paymentOptions(method: OnlinePaymentMethod) {
  if (method === 'card') return 'card';
  return method === 'mtn' ? 'mobilemoneyrwanda' : 'mobilemoneyxof';
}

export function amountMatches(charge: Charge, currency: string, amount: number) {
  if (currency.toUpperCase() !== charge.currency) return false;
  if (charge.currency === 'USD') return Math.round(amount * 100) === charge.amount;
  return Math.round(amount) === charge.amount;
}
