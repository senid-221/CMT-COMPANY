import { randomInt } from 'node:crypto';
import { prisma } from './db';
import { buildOrderNumber, isSlot, quote, type Slot } from './pricing';
import { isOnlineMethod, isPaymentMethod, type PaymentMethod } from './payment-methods';
import { methodAvailable } from './payments';
import { toUnits } from './money';
import { evaluateCode, normalizeCode } from './coupons';
import { storefrontActive } from './vendors';
import type { Market } from './markets';

export type CreateOrderInput = {
  lines: { handle: string; quantity: number }[];
  customerName: string;
  phone: string;
  email?: string | null;
  addressLine: string;
  city: string;
  deliveryNote?: string | null;
  slot: Slot;
  paymentMethod?: PaymentMethod;
  customerId?: string | null;
  coupon?: string | null;
  /** Resolved from the shopper's cookie or geo header; never trusted from the request body. */
  market: Market;
};

export type OrderResult =
  | { ok: true; number: string; totalCents: number; paymentMethod: PaymentMethod }
  | { ok: false; error: string };


const PHONE = /^[+]?[0-9\s-]{8,16}$/;

export function validate(input: CreateOrderInput): string[] {
  const errors: string[] = [];
  if (!input.customerName || input.customerName.trim().length < 3) errors.push('customerName');
  if (!PHONE.test(input.phone ?? '')) errors.push('phone');
  if (!input.addressLine || input.addressLine.trim().length < 6) errors.push('addressLine');
  if (!input.city || input.city.trim().length < 2) errors.push('city');
  if (!isSlot(input.slot)) errors.push('slot');
  if (!input.lines?.length) errors.push('lines');
  if ((input.email ?? '').length > 120) errors.push('email');
  return errors;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  const market = input.market;
  const paymentMethod = input.paymentMethod ?? 'cod';
  if (!isPaymentMethod(paymentMethod)) return { ok: false, error: 'invalid:paymentMethod' };
  if (!market.methods.includes(paymentMethod)) return { ok: false, error: 'invalid:paymentMethod' };
  if (!methodAvailable(paymentMethod)) return { ok: false, error: 'payment-unavailable' };

  const errors = validate(input);
  if (errors.length) return { ok: false, error: `invalid:${errors.join(',')}` };

  const wanted = input.lines
    .map((l) => ({ handle: String(l.handle).slice(0, 80), quantity: Math.floor(Number(l.quantity)) }))
    .filter((l) => l.handle && Number.isFinite(l.quantity) && l.quantity > 0 && l.quantity <= 99);
  if (!wanted.length) return { ok: false, error: 'invalid:lines' };

  const products = await prisma.product.findMany({
    where: { handle: { in: wanted.map((w) => w.handle) } },
    select: {
      id: true,
      handle: true,
      name: true,
      unit: true,
      priceCents: true,
      stock: true,
      sellerId: true,
      seller: {
        select: { id: true, name: true, subaccountId: true, storefrontUntil: true, suspendedAt: true },
      },
    },
  });
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const resolved: { product: (typeof products)[number]; quantity: number }[] = [];
  for (const w of wanted) {
    const product = byHandle.get(w.handle);
    if (!product) return { ok: false, error: 'stale-cart' };
    if (product.seller && !storefrontActive(product.seller)) return { ok: false, error: 'stale-cart' };
    if (w.quantity > product.stock) return { ok: false, error: 'stale-cart' };
    resolved.push({ product, quantity: w.quantity });
  }

  const lines = resolved.map((r) => ({ unitPriceCents: r.product.priceCents, quantity: r.quantity }));
  const totals = quote(lines, input.slot);
  if (totals.itemCount === 0) return { ok: false, error: 'invalid:lines' };

  const couponCode = normalizeCode(input.coupon);
  let discountCents = 0;
  let appliedCoupon: string | null = null;
  if (couponCode) {
    const check = await evaluateCode(couponCode, totals.subtotalCents, market.code);
    if (!check.ok) return { ok: false, error: `coupon:${check.error}` };
    discountCents = check.discountCents;
    appliedCoupon = check.coupon.code;
  }
  const grandTotal = Math.max(0, totals.subtotalCents - discountCents) + totals.deliveryFeeCents;

  /** Money handed to a rider or transferred to the bank is collected in the local currency. */
  const manualCurrency = paymentMethod === 'card' ? 'USD' : market.currency;
  const manualAmount =
    manualCurrency === 'USD' ? grandTotal : toUnits(grandTotal, { currency: manualCurrency, ratePerUsd: market.ratePerUsd });

  const vendorTotals = new Map<string, { sellerId: string; sellerName: string; subaccountId: string | null; gross: number }>();
  for (const item of resolved) {
    const seller = item.product.seller;
    if (!seller) continue;
    const row = vendorTotals.get(seller.id) ?? {
      sellerId: seller.id,
      sellerName: seller.name,
      subaccountId: seller.subaccountId,
      gross: 0,
    };
    row.gross += item.product.priceCents * item.quantity;
    vendorTotals.set(seller.id, row);
  }

  let allocatedRatio = 0;
  const settlements = [...vendorTotals.values()].map((vendor) => {
    const discountShare = totals.subtotalCents > 0 ? Math.round((discountCents * vendor.gross) / totals.subtotalCents) : 0;
    const amountCents = Math.max(0, vendor.gross - discountShare);
    const wantedRatio = grandTotal > 0 ? (amountCents / grandTotal) * 100 : 0;
    const ratio = Math.round(Math.min(wantedRatio, Math.max(0, 100 - allocatedRatio)) * 100) / 100;
    allocatedRatio += ratio;
    return {
      sellerId: vendor.sellerId,
      sellerName: vendor.sellerName,
      subaccountId: vendor.subaccountId,
      amountCents,
      ratio,
      status: isOnlineMethod(paymentMethod) && vendor.subaccountId ? 'split' : 'pending',
    };
  });

  for (let attempt = 0; attempt < 6; attempt++) {
    const number = buildOrderNumber(String(randomInt(0, 1_000_000)));
    const existing = await prisma.order.findUnique({ where: { number }, select: { id: true } });
    if (existing) continue;

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          number,
          status: 'placed',
          customerName: input.customerName.trim().slice(0, 80),
          phone: input.phone.trim().slice(0, 20),
          email: input.email?.trim().toLowerCase().slice(0, 120) || null,
          addressLine: input.addressLine.trim().slice(0, 200),
          city: input.city.trim().slice(0, 60),
          deliveryNote: input.deliveryNote?.trim().slice(0, 200) || null,
          slot: input.slot,
          paymentMethod,
          paymentStatus: isOnlineMethod(paymentMethod) ? 'pending' : 'unpaid',
          paymentCurrency: isOnlineMethod(paymentMethod) ? null : manualCurrency,
          paymentAmount: isOnlineMethod(paymentMethod) ? null : manualAmount,
          market: market.code,
          customerId: input.customerId || null,
          subtotalCents: totals.subtotalCents,
          deliveryFeeCents: totals.deliveryFeeCents,
          discountCents,
          couponCode: appliedCoupon,
          totalCents: grandTotal,
          items: {
            create: resolved.map((r) => ({
              productId: r.product.id,
              sellerId: r.product.sellerId,
              sellerName: r.product.seller?.name ?? null,
              productName: r.product.name,
              unit: r.product.unit,
              unitPriceCents: r.product.priceCents,
              quantity: r.quantity,
              lineTotalCents: r.product.priceCents * r.quantity,
            })),
          },
        },
        select: { id: true, number: true, totalCents: true },
      });

      if (settlements.length) {
        await tx.vendorSettlement.createMany({
          data: settlements.map((settlement) => ({ ...settlement, orderId: order.id })),
        });
      }

      for (const r of resolved) {
        await tx.product.update({
          where: { id: r.product.id },
          data: { stock: { decrement: r.quantity } },
        });
      }

      if (appliedCoupon) {
        await tx.coupon.update({ where: { code: appliedCoupon }, data: { usedCount: { increment: 1 } } });
      }

      return { ok: true as const, number: order.number, totalCents: order.totalCents, paymentMethod };
    });
  }

  return { ok: false, error: 'order-number-collision' };
}

export async function findOrdersByPhone(phone: string) {
  const clean = phone.trim();
  if (!PHONE.test(clean)) return [];
  return prisma.order.findMany({
    where: { phone: { in: [clean, clean.replace(/\s+/g, '')] } },
    orderBy: { placedAt: 'desc' },
    take: 25,
    include: { items: true },
  });
}

export async function findOrder(number: string) {
  return prisma.order.findUnique({ where: { number: number.trim().toUpperCase() }, include: { items: true } });
}

export async function findOrdersForCustomer(customer: { id: string; email: string }) {
  return prisma.order.findMany({
    where: {
      OR: [{ customerId: customer.id }, { customerId: null, email: customer.email }],
    },
    orderBy: { placedAt: 'desc' },
    take: 25,
    include: { items: true },
  });
}
