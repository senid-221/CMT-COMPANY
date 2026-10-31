import { prisma } from './db';

export type CouponRow = {
  id: string;
  code: string;
  kind: string;
  percent: number | null;
  amountCents: number | null;
  minSubtotalCents: number;
  maxDiscountCents: number | null;
  markets: string;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  label: string;
  labelFr: string | null;
};

export type CouponError = 'invalid' | 'expired' | 'notStarted' | 'minSubtotal' | 'used' | 'market';

export type CouponCheck =
  | { ok: true; coupon: CouponRow; discountCents: number }
  | { ok: false; error: CouponError; shortfallCents?: number };

export function normalizeCode(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32);
}

export function marketAllows(coupon: Pick<CouponRow, 'markets'>, marketCode: string): boolean {
  const list = String(coupon.markets || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(String(marketCode || '').toUpperCase());
}

export function discountFor(
  coupon: Pick<CouponRow, 'kind' | 'percent' | 'amountCents' | 'maxDiscountCents'>,
  subtotalCents: number,
): number {
  const raw = coupon.kind === 'amount' ? (coupon.amountCents ?? 0) : Math.round(((coupon.percent ?? 0) / 100) * subtotalCents);
  const capped = coupon.maxDiscountCents != null ? Math.min(raw, coupon.maxDiscountCents) : raw;
  return Math.max(0, Math.min(Math.round(capped), subtotalCents));
}

export function headroom(coupon: CouponRow): boolean {
  return coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit;
}

export function evaluate(coupon: CouponRow, subtotalCents: number, marketCode: string, now = new Date()): CouponCheck {
  if (!coupon.active) return { ok: false, error: 'invalid' };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: 'notStarted' };
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false, error: 'expired' };
  if (!headroom(coupon)) return { ok: false, error: 'used' };
  if (!marketAllows(coupon, marketCode)) return { ok: false, error: 'market' };
  if (subtotalCents < coupon.minSubtotalCents) {
    return { ok: false, error: 'minSubtotal', shortfallCents: coupon.minSubtotalCents - subtotalCents };
  }
  return { ok: true, coupon, discountCents: discountFor(coupon, subtotalCents) };
}

const COUPON_FIELDS = {
  id: true,
  code: true,
  kind: true,
  percent: true,
  amountCents: true,
  minSubtotalCents: true,
  maxDiscountCents: true,
  markets: true,
  startsAt: true,
  endsAt: true,
  usageLimit: true,
  usedCount: true,
  active: true,
  label: true,
  labelFr: true,
} as const;

export async function findByCode(input: unknown): Promise<CouponRow | null> {
  const code = normalizeCode(input);
  if (!code) return null;
  return prisma.coupon.findUnique({ where: { code }, select: COUPON_FIELDS });
}

export async function evaluateCode(
  input: unknown,
  subtotalCents: number,
  marketCode: string,
): Promise<CouponCheck> {
  const coupon = await findByCode(input);
  if (!coupon) return { ok: false, error: 'invalid' };
  return evaluate(coupon, subtotalCents, marketCode);
}

/** Coupons worth advertising: active, started, not finished, still has uses left. */
export async function getActiveCoupons(marketCode: string, take = 6): Promise<CouponRow[]> {
  const now = new Date();
  const rows = await prisma.coupon.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ endsAt: 'asc' }, { createdAt: 'desc' }],
    take: 40,
    select: COUPON_FIELDS,
  });
  return rows.filter((row) => marketAllows(row, marketCode) && headroom(row)).slice(0, take);
}

export function couponLabel(coupon: Pick<CouponRow, 'label' | 'labelFr'>, locale: string): string {
  const value = locale === 'fr' ? coupon.labelFr : coupon.label;
  return (value || '').trim();
}
