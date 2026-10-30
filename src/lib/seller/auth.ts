import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { clearSession, readSession, writeSession } from '@/lib/session';

const SELLER_COOKIE = 'cmb_seller';
const SESSION_MS = 7 * 24 * 3_600_000;

export type Seller = { id: string; name: string; email: string; phone: string | null; createdAt: Date };

export async function startSellerSession(sellerId: string) {
  await writeSession(SELLER_COOKIE, sellerId, SESSION_MS);
}

export async function endSellerSession() {
  await clearSession(SELLER_COOKIE);
}

export async function getSeller(): Promise<Seller | null> {
  const id = await readSession(SELLER_COOKIE);
  if (!id) return null;
  return prisma.seller.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
}

export async function requireSeller(): Promise<Seller> {
  const seller = await getSeller();
  if (!seller) redirect('/seller/login');
  return seller;
}
