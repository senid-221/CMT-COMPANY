import { randomBytes } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from './db';
import { chargeFor, amountMatches, type Charge, type Rates } from './charge';
import { ONLINE_PAYMENT_METHODS, isOnlineMethod, type OnlinePaymentMethod } from './payment-methods';
import { onlineMethodAvailable, paymentConfig, requestPaymentLink, rwfPerUsd, verifyTransaction, xofPerUsd } from './payments';
import { nextStorefrontEnd } from './vendors';
import type { Currency } from './markets';

/** The storefront fee is quoted in RWF; every rail is charged at the RWF-equivalent value. */
export function feeUsdCents(feeRwf: number) {
  const rate = rwfPerUsd();
  if (!rate) return 0;
  return Math.max(1, Math.round((feeRwf / rate) * 100));
}

export type StorefrontChargeOption = { method: OnlinePaymentMethod; charge: Charge };

export function storefrontChargeOptions(feeRwf: number): StorefrontChargeOption[] {
  const cents = feeUsdCents(feeRwf);
  if (!cents) return [];
  const rails = paymentConfig().rails;
  const rates: Rates = { RWF: rwfPerUsd(), XOF: xofPerUsd() };
  return ONLINE_PAYMENT_METHODS.filter((method) => rails[method]).map((method) => ({
    method,
    charge: chargeFor(method, cents, rates),
  }));
}

export function newStorefrontRef() {
  return `CMB-VS-${randomBytes(5).toString('hex')}`;
}

export function isStorefrontRef(value: string) {
  return /^CMB-VS-[0-9a-f]{10}$/i.test(value.trim());
}

export async function invoiceByReference(reference: string) {
  if (!isStorefrontRef(reference)) return null;
  return prisma.storefrontInvoice.findUnique({
    where: { reference: reference.trim() },
    select: {
      id: true,
      reference: true,
      sellerId: true,
      feeRwf: true,
      days: true,
      totalCents: true,
      currency: true,
      amount: true,
      status: true,
    },
  });
}

export async function startStorefrontPayment(input: {
  sellerId: string;
  method: string;
  redirectUrl: string;
}) {
  if (!isOnlineMethod(input.method) || !onlineMethodAvailable(input.method)) throw new Error('payment-not-configured');

  const seller = await prisma.seller.findUnique({
    where: { id: input.sellerId },
    select: { id: true, name: true, email: true, phone: true, feeRwf: true, feeDays: true },
  });
  if (!seller) throw new Error('seller-not-found');

  const cents = feeUsdCents(seller.feeRwf);
  if (!cents) throw new Error('payment-not-configured');
  const charge = chargeFor(input.method, cents, { RWF: rwfPerUsd(), XOF: xofPerUsd() });
  const reference = newStorefrontRef();

  const invoice = await prisma.storefrontInvoice.create({
    data: {
      reference,
      sellerId: seller.id,
      feeRwf: seller.feeRwf,
      days: seller.feeDays,
      totalCents: cents,
      currency: charge.currency,
      amount: charge.amount,
    },
    select: { id: true },
  });

  try {
    const { link } = await requestPaymentLink({
      txRef: reference,
      method: input.method,
      totalCents: cents,
      customerName: seller.name,
      email: seller.email,
      phone: seller.phone ?? '',
      redirectUrl: input.redirectUrl,
      title: 'CityMarket vendor storefront',
      description: `${seller.feeDays}-day storefront subscription`,
      meta: { invoice: reference, seller: seller.id, method: input.method },
    });
    return { link, reference, charge };
  } catch (error) {
    await prisma.storefrontInvoice.update({ where: { id: invoice.id }, data: { status: 'failed' } });
    throw error;
  }
}

export async function markStorefrontInvoiceFailed(reference: string) {
  const invoice = await invoiceByReference(reference);
  if (!invoice) return null;
  await prisma.storefrontInvoice.updateMany({
    where: { id: invoice.id, status: 'pending' },
    data: { status: 'failed' },
  });
  return invoice;
}

export async function settleStorefrontInvoice(input: { reference: string; transactionId: string }) {
  const invoice = await invoiceByReference(input.reference);
  if (!invoice) return { state: 'unknown' as const };
  if (invoice.status === 'paid') return { state: 'paid' as const, sellerId: invoice.sellerId };

  const transaction = await verifyTransaction(input.transactionId);
  const charge: Charge = { currency: invoice.currency as Currency, amount: invoice.amount };
  const valid =
    transaction.successful &&
    transaction.txRef.trim() === invoice.reference &&
    amountMatches(charge, transaction.currency, transaction.amount);

  if (!valid) {
    await prisma.storefrontInvoice.updateMany({
      where: { id: invoice.id, status: { not: 'paid' } },
      data: { status: 'failed', transactionId: input.transactionId },
    });
    return { state: 'failed' as const, sellerId: invoice.sellerId };
  }

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.storefrontInvoice.updateMany({
      where: { id: invoice.id, status: { not: 'paid' } },
      data: { status: 'paid', paidAt: new Date(), transactionId: input.transactionId },
    });
    if (!claimed.count) return { state: 'paid' as const, periodEnd: null };

    const seller = await tx.seller.findUnique({
      where: { id: invoice.sellerId },
      select: { storefrontUntil: true },
    });
    const periodEnd = nextStorefrontEnd(seller?.storefrontUntil ?? null, invoice.days);
    await tx.seller.update({ where: { id: invoice.sellerId }, data: { storefrontUntil: periodEnd } });
    await tx.storefrontInvoice.update({ where: { id: invoice.id }, data: { periodEnd } });
    return { state: 'paid' as const, periodEnd };
  });

  revalidateTag('catalog');
  revalidatePath('/seller');
  revalidatePath('/seller/billing');
  revalidatePath('/store/[handle]', 'page');

  return { ...result, sellerId: invoice.sellerId };
}

export function storefrontCallbackUrl(origin: string) {
  return `${origin.replace(/\/+$/, '')}/api/payments/flutterwave/callback`;
}
