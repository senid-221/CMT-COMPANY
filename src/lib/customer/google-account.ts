import { prisma } from '@/lib/db';
import type { GoogleProfile } from '@/lib/google';

export type LinkedCustomer = { id: string; email: string; name: string };

function displayName(profile: GoogleProfile) {
  const fallback = profile.email.split('@')[0].slice(0, 80);
  return profile.name && profile.name.length >= 2 ? profile.name : fallback;
}

export async function linkGoogleCustomer(profile: GoogleProfile): Promise<LinkedCustomer | null> {
  const existing = await prisma.customer.findFirst({
    where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
    select: { id: true, email: true, name: true, googleId: true },
  });

  if (existing) {
    if (existing.googleId && existing.googleId !== profile.googleId) return null;
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        googleId: profile.googleId,
        lastLoginAt: new Date(),
        name: existing.name.trim() ? existing.name : displayName(profile),
      },
      select: { id: true, email: true, name: true },
    });
  }

  try {
    return await prisma.customer.create({
      data: {
        email: profile.email,
        name: displayName(profile),
        googleId: profile.googleId,
        lastLoginAt: new Date(),
      },
      select: { id: true, email: true, name: true },
    });
  } catch {
    const retry = await prisma.customer.findUnique({
      where: { email: profile.email },
      select: { id: true, email: true, name: true, googleId: true },
    });
    if (!retry || (retry.googleId && retry.googleId !== profile.googleId)) return null;
    return prisma.customer.update({
      where: { id: retry.id },
      data: { googleId: profile.googleId, lastLoginAt: new Date() },
      select: { id: true, email: true, name: true },
    });
  }
}
