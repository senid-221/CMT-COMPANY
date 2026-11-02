import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { createOrder } from '@/lib/orders';
import { paymentRedirectUrl, startOrderPayment } from '@/lib/payments';
import { isOnlineMethod, type PaymentMethod } from '@/lib/payment-methods';
import type { Slot } from '@/lib/pricing';
import type { Market } from '@/lib/markets';
import type { Customer } from '@/lib/customer/auth';

const TTL_MS = 15 * 60_000;
const used = new Map<string, number>();

export type DraftLine = { handle: string; qty: number };

export type DraftPayload = {
  v: 1;
  n: string;
  ip: string;
  exp: number;
  customerId: string | null;
  market: string;
  lines: DraftLine[];
  customerName: string;
  phone: string;
  email: string | null;
  addressLine: string;
  city: string;
  deliveryNote: string | null;
  slot: Slot;
  paymentMethod: PaymentMethod;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  return value && value.length >= 32 ? value : null;
}

export function chatOrdersEnabled() {
  return secret() !== null;
}

function mac(body: string, key: string) {
  return createHmac('sha256', key).update(body).digest('base64url');
}

export function draftExpiry() {
  return Date.now() + TTL_MS;
}

export function signDraft(payload: DraftPayload): string | null {
  const key = secret();
  if (!key) return null;
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${mac(body, key)}`;
}

export function readDraft(token: string): DraftPayload | null {
  const key = secret();
  if (!key || !token) return null;
  const [body, given] = token.split('.');
  if (!body || !given) return null;

  const expected = Buffer.from(mac(body, key));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let payload: DraftPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as DraftPayload;
  } catch {
    return null;
  }
  if (payload?.v !== 1 || !Array.isArray(payload.lines) || !payload.n) return null;
  if (!Number.isFinite(payload.exp) || payload.exp < Date.now()) return null;
  return payload;
}

function claim(nonce: string, exp: number) {
  const now = Date.now();
  if (used.size > 2000) {
    for (const [key, until] of used) if (until < now) used.delete(key);
  }
  if (used.has(nonce)) return false;
  used.set(nonce, exp);
  return true;
}

function release(nonce: string) {
  used.delete(nonce);
}

export function newDraftNonce() {
  return randomBytes(12).toString('base64url');
}

export type DraftResult =
  | { ok: true; number: string; totalCents: number; paymentUrl: string | null; paymentError: boolean }
  | { ok: false; error: string };

export async function placeDraftOrder(input: {
  token: string;
  ip: string;
  customer: Customer | null;
  market: Market;
  request: Request;
}): Promise<DraftResult> {
  const draft = readDraft(input.token);
  if (!draft) return { ok: false, error: 'expired' };
  if (draft.ip !== input.ip) return { ok: false, error: 'expired' };
  if (draft.market !== input.market.code) return { ok: false, error: 'market-changed' };
  if (!claim(draft.n, draft.exp)) return { ok: false, error: 'duplicate' };

  const result = await createOrder({
    lines: draft.lines.map((line) => ({ handle: line.handle, quantity: line.qty })),
    customerName: draft.customerName,
    phone: draft.phone,
    email: draft.email,
    addressLine: draft.addressLine,
    city: draft.city,
    deliveryNote: draft.deliveryNote,
    slot: draft.slot,
    paymentMethod: draft.paymentMethod,
    customerId: input.customer?.id ?? draft.customerId,
    market: input.market,
  });

  if (!result.ok) {
    release(draft.n);
    return { ok: false, error: result.error };
  }

  let paymentUrl: string | null = null;
  let paymentError = false;
  if (isOnlineMethod(result.paymentMethod)) {
    try {
      paymentUrl = await startOrderPayment({
        number: result.number,
        totalCents: result.totalCents,
        customerName: draft.customerName,
        email: draft.email,
        phone: result.phone,
        paymentMethod: result.paymentMethod,
        paymentStatus: 'pending',
        status: 'placed',
        redirectUrl: paymentRedirectUrl(input.request),
      });
    } catch {
      paymentError = true;
      await prisma.order.updateMany({ where: { number: result.number }, data: { paymentStatus: 'failed' } });
    }
  }

  return { ok: true, number: result.number, totalCents: result.totalCents, paymentUrl, paymentError };
}
