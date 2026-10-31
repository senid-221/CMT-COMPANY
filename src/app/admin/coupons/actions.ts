'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { parseMoney } from '@/lib/money';
import { normalizeCode } from '@/lib/coupons';

const MARKET_CODES = ['RW', 'SN', 'CI', 'KE', 'NG', 'GH', 'ZA', 'US'];

function int(value: FormDataEntryValue | null) {
  const parsed = Math.round(Number(String(value ?? '').replace(/[^0-9.-]/g, '')));
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalInt(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Math.round(Number(raw.replace(/[^0-9.-]/g, '')));
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();
  return raw ? parseMoney(raw) : null;
}

/** "2026-12-31" becomes the end of that local day; blank means no bound. */
function dayBoundary(value: FormDataEntryValue | null, endOfDay: boolean): Date | null {
  const raw = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function marketList(value: FormDataEntryValue | null) {
  const list = String(value ?? '')
    .split(',')
    .map((item) => item.trim().toUpperCase().slice(0, 2))
    .filter((item) => MARKET_CODES.includes(item));
  return [...new Set(list)].join(',');
}

export async function saveCoupon(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const target = '/admin/coupons';
  const rawCode = normalizeCode(formData.get('code'));
  const kind = formData.get('kind') === 'amount' ? 'amount' : 'percent';
  const percent = int(formData.get('percent'));
  const amountCents = parseMoney(formData.get('amount'));
  const minSubtotalCents = parseMoney(formData.get('minSubtotal'));
  const maxDiscountCents = optionalMoney(formData.get('maxDiscount'));
  const usageLimit = optionalInt(formData.get('usageLimit'));
  const label = String(formData.get('label') ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const labelFr = String(formData.get('labelFr') ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);

  if (rawCode.length < 3) redirect(`${target}?error=invalid`);
  if (kind === 'percent' && (percent < 1 || percent > 95)) redirect(`${target}?error=invalid`);
  if (kind === 'amount' && (amountCents <= 0 || amountCents > 10_000_000)) redirect(`${target}?error=invalid`);
  if (minSubtotalCents < 0) redirect(`${target}?error=invalid`);
  if (maxDiscountCents !== null && maxDiscountCents < 0) redirect(`${target}?error=invalid`);
  if (usageLimit !== null && (usageLimit < 1 || usageLimit > 100_000)) redirect(`${target}?error=invalid`);

  const startsAt = dayBoundary(formData.get('startsAt'), false);
  const endsAt = dayBoundary(formData.get('endsAt'), true);
  if (startsAt && endsAt && startsAt > endsAt) redirect(`${target}?error=invalid`);

  const duplicate = await prisma.coupon.findFirst({ where: { code: rawCode, NOT: id ? { id } : {} }, select: { id: true } });
  if (duplicate) redirect(`${target}?error=duplicate-code`);

  const data = {
    code: rawCode,
    kind,
    percent: kind === 'percent' ? percent : null,
    amountCents: kind === 'amount' ? amountCents : null,
    minSubtotalCents,
    maxDiscountCents,
    markets: marketList(formData.get('markets')),
    startsAt,
    endsAt,
    usageLimit,
    active: formData.get('active') === 'on',
    label,
    labelFr: labelFr || null,
  };

  if (id) {
    await prisma.coupon.update({ where: { id }, data });
  } else {
    await prisma.coupon.create({ data: { ...data, usedCount: 0 } });
  }

  revalidatePath('/');
  revalidatePath('/checkout');
  redirect(`${target}?saved=1`);
}

export async function toggleCoupon(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const current = id ? await prisma.coupon.findUnique({ where: { id }, select: { active: true } }) : null;
  if (!current) redirect('/admin/coupons?error=invalid');
  await prisma.coupon.update({ where: { id }, data: { active: !current.active } });
  revalidatePath('/');
  revalidatePath('/admin/coupons');
  redirect('/admin/coupons?saved=1');
}

export async function deleteCoupon(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/admin/coupons?error=invalid');
  await prisma.coupon.delete({ where: { id } }).catch(() => null);
  revalidatePath('/');
  revalidatePath('/admin/coupons');
  redirect('/admin/coupons?deleted=1');
}
