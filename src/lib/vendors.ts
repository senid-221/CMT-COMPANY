import { Prisma } from '@prisma/client';
import { prisma } from './db';

export const DEFAULT_STOREFRONT_FEE_RWF = 20_000;
export const DEFAULT_STOREFRONT_DAYS = 30;

export type StorefrontState = {
  storefrontUntil: Date | null;
  suspendedAt: Date | null;
};

/** A storefront is live only while the subscription is paid and the admin has not suspended it. */
export function storefrontActive(seller: StorefrontState | null | undefined): boolean {
  if (!seller || seller.suspendedAt) return false;
  return seller.storefrontUntil !== null && seller.storefrontUntil.getTime() > Date.now();
}

export function storefrontStatus(seller: StorefrontState | null | undefined) {
  if (!seller) return 'missing' as const;
  if (seller.suspendedAt) return 'suspended' as const;
  if (storefrontActive(seller)) return 'active' as const;
  if (seller.storefrontUntil) return 'expired' as const;
  return 'unpaid' as const;
}

export function nextStorefrontEnd(current: Date | null, days: number, now = new Date()) {
  const base = current && current.getTime() > now.getTime() ? current : now;
  return new Date(base.getTime() + Math.max(1, days) * 86_400_000);
}

/** Unowned catalogue rows stay visible; vendor rows need a paid, unsuspended storefront. */
export function activeVendorWhere(now = new Date()): Prisma.ProductWhereInput {
  return {
    OR: [{ sellerId: null }, { seller: { is: { suspendedAt: null, storefrontUntil: { gt: now } } } }],
  };
}

export function vendorSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function uniqueVendorHandle(name: string) {
  const base = vendorSlug(name) || 'store';
  for (let suffix = 0; suffix < 50; suffix++) {
    const handle = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const taken = await prisma.seller.findUnique({ where: { handle }, select: { id: true } });
    if (!taken) return handle;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Flutterwave subaccounts start with RS_ followed by the account hash. */
export function validSubaccountId(value: string) {
  return /^RS_[A-Za-z0-9]{8,40}$/.test(value.trim());
}

export type PublicVendor = {
  id: string;
  handle: string;
  name: string;
  tagline: string | null;
  about: string | null;
  logo: string | null;
  city: string | null;
  createdAt: Date;
  storefrontUntil: Date;
};

export async function getPublicVendor(handle: string): Promise<PublicVendor | null> {
  const row = await prisma.seller.findFirst({
    where: { handle, suspendedAt: null, storefrontUntil: { gt: new Date() } },
    select: {
      id: true,
      handle: true,
      name: true,
      tagline: true,
      about: true,
      logo: true,
      city: true,
      createdAt: true,
      storefrontUntil: true,
    },
  });
  if (!row || !row.handle || !row.storefrontUntil) return null;
  return { ...row, handle: row.handle, storefrontUntil: row.storefrontUntil };
}
