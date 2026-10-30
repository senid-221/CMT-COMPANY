import { randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from './db';
import { isOnlineMethod, type OnlinePaymentMethod } from './payment-methods';

const DEFAULT_API_BASE = 'https://api.flutterwave.com';
const CUSTOMER_EMAIL_FALLBACK = 'orders@citymarket.rw';

export type Charge = { currency: 'USD' | 'XOF'; amount: number };

export type PaymentConfig = { card: boolean; mobile: boolean; xofRate: number };

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
  const rate = Number(process.env.PAY_XOF_PER_USD ?? '');
  return Number.isFinite(rate) && rate >= 1 ? rate : 0;
}

export function mobileMoneyConfigured() {
  return flutterwaveConfigured() && xofPerUsd() > 0;
}

export function paymentConfig(): PaymentConfig {
  return { card: flutterwaveConfigured(), mobile: mobileMoneyConfigured(), xofRate: xofPerUsd() };
}

export function methodAvailable(method: string) {
  if (method === 'cod') return true;
  if (method === 'card') return flutterwaveConfigured();
  return isOnlineMethod(method) && mobileMoneyConfigured();
}

export function chargeFor(method: OnlinePaymentMethod, totalCents: number): Charge {
  if (method === 'card') return { currency: 'USD', amount: Math.max(1, Math.round(totalCents)) };
  const amount = Math.max(1, Math.round((totalCents / 100) * xofPerUsd()));
  return { currency: 'XOF', amount };
}

export function apiAmount(charge: Charge) {
  return charge.currency === 'USD' ? Number((charge.amount / 100).toFixed(2)) : charge.amount;
}

export function newPaymentRef(orderNumber: string) {
  return `${orderNumber}-${randomBytes(5).toString('hex')}`;
}

export function orderNumberFromRef(ref: string) {
  const match = /^(CMB-[0-9]{6})-[0-9a-f]{10}$/i.exec(ref.trim());
  return match ? match[1].toUpperCase() : null;
}

export function amountMatches(charge: Charge, currency: string, amount: number) {
  if (currency.toUpperCase() !== charge.currency) return false;
  if (charge.currency === 'XOF') return Math.round(amount) === charge.amount;
  return Math.round(amount * 100) === charge.amount;
}

export function webhookHashMatches(header: string | null) {
  const expected = (process.env.FLW_WEBHOOK_HASH ?? '').trim();
  if (!expected || !header) return false;
  const a = Buffer.from(header.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function initiatePayment(input: {
  orderNumber: string;
  method: OnlinePaymentMethod;
  totalCents: number;
  customerName: string;
  email: string | null;
  phone: string;
  redirectUrl: string;
}) {
  const key = secretKey();
  if (!key) throw new Error('payment-not-configured');

  const charge = chargeFor(input.method, input.totalCents);
  const txRef = newPaymentRef(input.orderNumber);
  const response = await fetch(`${apiBase()}/v3/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: apiAmount(charge),
      currency: charge.currency,
      redirect_url: input.redirectUrl,
      payment_options: input.method === 'card' ? 'card' : 'mobilemoneyxof',
      customer: {
        email: input.email || CUSTOMER_EMAIL_FALLBACK,
        name: input.customerName,
        phonenumber: input.phone,
      },
      customizations: { title: 'CityMarket', description: `Order ${input.orderNumber}` },
      meta: { order: input.orderNumber, method: input.method },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await response.json().catch(() => null)) as { status?: string; data?: { link?: string } } | null;
  const link = body?.data?.link;
  if (!response.ok || body?.status !== 'success' || typeof link !== 'string' || !/^https?:\/\//i.test(link)) {
    throw new Error('payment-init-failed');
  }

  return { link, txRef, charge };
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

  const result = await initiatePayment({
    orderNumber: order.number,
    method: order.paymentMethod,
    totalCents: order.totalCents,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    redirectUrl: order.redirectUrl,
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
  await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: 'pending' },
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
