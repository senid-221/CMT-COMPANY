import { randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from './db';
import { isOnlineMethod, type OnlinePaymentMethod, type PaymentMethod } from './payment-methods';
import { bankDetails, ratePerUsd } from './market';
import { amountMatches, apiAmount, chargeFor as localChargeFor, paymentOptions, type Charge } from './charge';

const DEFAULT_API_BASE = 'https://api.flutterwave.com';
const CUSTOMER_EMAIL_FALLBACK = 'orders@citymarket.rw';

/** Which rails Flutterwave can actually take money through for this deployment. */
export type PaymentConfig = {
  card: boolean;
  rails: Record<OnlinePaymentMethod, boolean>;
  rates: { RWF: number; XOF: number };
};

export type VerifiedTransaction = {
  successful: boolean;
  txRef: string;
  amount: number;
  currency: string;
  transactionId: string;
};

function secretKey() {
  return (process.env.FLW_SECRET_KEY ?? '').trim();
}

function apiBase() {
  return (process.env.FLW_API_BASE ?? '').trim().replace(/\/+$/, '') || DEFAULT_API_BASE;
}

export function flutterwaveConfigured() {
  return secretKey().length > 0;
}

export function xofPerUsd() {
  return ratePerUsd('XOF');
}

export function rwfPerUsd() {
  return ratePerUsd('RWF');
}

/** Flutterwave only accepts mobile money in the rail's own currency, so a missing rate kills the rail. */
export function onlineMethodAvailable(method: OnlinePaymentMethod) {
  if (!flutterwaveConfigured()) return false;
  if (method === 'card') return true;
  if (method === 'mtn') return rwfPerUsd() > 0;
  return xofPerUsd() > 0;
}

export function methodAvailable(method: PaymentMethod) {
  if (method === 'cod') return true;
  if (method === 'bank') return bankDetails() !== null;
  return onlineMethodAvailable(method);
}

export function paymentConfig(): PaymentConfig {
  const card = onlineMethodAvailable('card');
  return {
    card,
    rails: {
      card,
      mtn: onlineMethodAvailable('mtn'),
      orange: onlineMethodAvailable('orange'),
      wave: onlineMethodAvailable('wave'),
    },
    rates: { RWF: rwfPerUsd(), XOF: xofPerUsd() },
  };
}

export function chargeFor(method: OnlinePaymentMethod, totalCents: number): Charge {
  return localChargeFor(method, totalCents, { RWF: rwfPerUsd(), XOF: xofPerUsd() });
}

export function newPaymentRef(orderNumber: string) {
  return `${orderNumber}-${randomBytes(5).toString('hex')}`;
}

export function orderNumberFromRef(ref: string) {
  const match = /^(CMB-[0-9]{6})-[0-9a-f]{10}$/i.exec(ref.trim());
  return match ? match[1].toUpperCase() : null;
}

export function webhookHashMatches(header: string | null) {
  const expected = (process.env.FLW_WEBHOOK_HASH ?? '').trim();
  if (!expected || !header) return false;
  const a = Buffer.from(header.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type SplitAccount = { id: string; ratio: number };

export type PaymentLinkInput = {
  txRef: string;
  method: OnlinePaymentMethod;
  totalCents: number;
  customerName: string;
  email: string | null;
  phone: string;
  redirectUrl: string;
  title?: string;
  description?: string;
  meta?: Record<string, string>;
  subaccounts?: SplitAccount[];
};

/** One hosted-checkout request; orders and storefront invoices share it. */
export async function requestPaymentLink(input: PaymentLinkInput) {
  const key = secretKey();
  if (!key) throw new Error('payment-not-configured');

  const charge = chargeFor(input.method, input.totalCents);
  const response = await fetch(`${apiBase()}/v3/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: apiAmount(charge),
      currency: charge.currency,
      redirect_url: input.redirectUrl,
      payment_options: paymentOptions(input.method),
      customer: {
        email: input.email || CUSTOMER_EMAIL_FALLBACK,
        name: input.customerName,
        phonenumber: input.phone,
      },
      customizations: { title: input.title ?? 'CityMarket', description: input.description ?? `Order ${input.txRef}` },
      meta: input.meta ?? {},
      ...(input.subaccounts?.length
        ? {
            subaccounts: input.subaccounts.map((account) => ({
              id: account.id,
              transaction_split_ratio: account.ratio,
            })),
          }
        : {}),
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await response.json().catch(() => null)) as { status?: string; data?: { link?: string } } | null;
  const link = body?.data?.link;
  if (!response.ok || body?.status !== 'success' || typeof link !== 'string' || !/^https?:\/\//i.test(link)) {
    throw new Error('payment-init-failed');
  }

  return { link, charge };
}

export async function initiatePayment(input: {
  orderNumber: string;
  method: OnlinePaymentMethod;
  totalCents: number;
  customerName: string;
  email: string | null;
  phone: string;
  redirectUrl: string;
  subaccounts?: SplitAccount[];
}) {
  const txRef = newPaymentRef(input.orderNumber);
  const result = await requestPaymentLink({
    txRef,
    method: input.method,
    totalCents: input.totalCents,
    customerName: input.customerName,
    email: input.email,
    phone: input.phone,
    redirectUrl: input.redirectUrl,
    description: `Order ${input.orderNumber}`,
    meta: { order: input.orderNumber, method: input.method },
    subaccounts: input.subaccounts,
  });
  return { ...result, txRef };
}

export async function startOrderPayment(order: {
  number: string;
  totalCents: number;
  customerName: string;
  email: string | null;
  phone: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  redirectUrl: string;
}) {
  if (!isOnlineMethod(order.paymentMethod)) throw new Error('not-online');
  if (order.paymentStatus === 'paid') throw new Error('already-paid');
  if (order.status === 'cancelled') throw new Error('cancelled');
  if (!methodAvailable(order.paymentMethod)) throw new Error('payment-not-configured');

  const settlements = await prisma.vendorSettlement.findMany({
    where: { order: { number: order.number }, subaccountId: { not: null }, ratio: { gt: 0 } },
    select: { subaccountId: true, ratio: true },
    orderBy: { createdAt: 'asc' },
  });

  let allocated = 0;
  const subaccounts: SplitAccount[] = [];
  for (const row of settlements) {
    if (!row.subaccountId) continue;
    const ratio = Math.round(Math.min(row.ratio, Math.max(0, 100 - allocated)) * 100) / 100;
    if (ratio <= 0) continue;
    allocated += ratio;
    subaccounts.push({ id: row.subaccountId, ratio });
  }

  const result = await initiatePayment({
    orderNumber: order.number,
    method: order.paymentMethod,
    totalCents: order.totalCents,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    redirectUrl: order.redirectUrl,
    subaccounts,
  });

  await prisma.order.update({
    where: { number: order.number },
    data: {
      paymentRef: result.txRef,
      paymentStatus: 'pending',
      paymentCurrency: result.charge.currency,
      paymentAmount: result.charge.amount,
      paymentTransactionId: null,
      paidAt: null,
    },
  });

  return result.link;
}

export function paymentRedirectUrl(request: Request) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  return `${configured || new URL(request.url).origin}/api/payments/flutterwave/callback`;
}

export async function verifyTransaction(transactionId: string): Promise<VerifiedTransaction> {
  const key = secretKey();
  if (!key) throw new Error('payment-not-configured');

  const response = await fetch(`${apiBase()}/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => null)) as {
    status?: string;
    data?: { id?: number | string; tx_ref?: string; amount?: number | string; currency?: string; status?: string };
  } | null;
  const data = body?.data;
  if (!response.ok || body?.status !== 'success' || !data) throw new Error('payment-verify-failed');

  return {
    successful: data.status === 'successful',
    txRef: String(data.tx_ref ?? ''),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? '').toUpperCase(),
    transactionId: String(data.id ?? transactionId),
  };
}

async function orderForRef(txRef: string) {
  const direct = await prisma.order.findUnique({
    where: { paymentRef: txRef },
    select: { id: true, number: true, paymentStatus: true, paymentCurrency: true, paymentAmount: true },
  });
  if (direct) return direct;
  const number = orderNumberFromRef(txRef);
  if (!number) return null;
  return prisma.order.findUnique({
    where: { number },
    select: { id: true, number: true, paymentStatus: true, paymentCurrency: true, paymentAmount: true },
  });
}

export async function paymentOrderNumber(txRef: string) {
  const order = await orderForRef(txRef);
  return order?.number ?? null;
}

export async function markPaymentFailed(txRef: string) {
  const order = await orderForRef(txRef);
  if (!order) return null;
  // Only the attempt still on file may fail: abandoning an old link must not mark a fresh,
  // in-flight attempt as failed.
  await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: 'pending', paymentRef: txRef },
    data: { paymentStatus: 'failed' },
  });
  return order.number;
}

export async function settlePayment(input: { txRef: string; transactionId: string }) {
  const order = await orderForRef(input.txRef);
  if (!order) return { state: 'unknown' as const };

  if (order.paymentStatus === 'paid') return { state: 'paid' as const, number: order.number };

  const transaction = await verifyTransaction(input.transactionId);
  const charge: Charge | null =
    order.paymentCurrency && order.paymentAmount
      ? { currency: order.paymentCurrency as Charge['currency'], amount: order.paymentAmount }
      : null;

  const valid =
    transaction.successful &&
    charge !== null &&
    orderNumberFromRef(transaction.txRef) === order.number &&
    amountMatches(charge, transaction.currency, transaction.amount);

  if (!valid) {
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: 'paid' } },
      data: { paymentStatus: 'failed', paymentTransactionId: input.transactionId },
    });
    return { state: 'failed' as const, number: order.number };
  }

  await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: { not: 'paid' } },
    data: {
      paymentStatus: 'paid',
      paidAt: new Date(),
      paymentRef: input.txRef,
      paymentTransactionId: input.transactionId,
    },
  });
  return { state: 'paid' as const, number: order.number };
}
