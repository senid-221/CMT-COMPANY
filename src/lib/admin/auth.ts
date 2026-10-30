import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { clearSession, readSession, writeSession } from '@/lib/session';

const ADMIN_COOKIE = 'cmb_admin';
const SESSION_MS = 12 * 3_600_000;

export async function startSession(adminId: string) {
  await writeSession(ADMIN_COOKIE, adminId, SESSION_MS);
}

export async function endSession() {
  await clearSession(ADMIN_COOKIE);
}

export type AdminUser = { id: string; email: string; name: string };

export async function getAdmin(): Promise<AdminUser | null> {
  const id = await readSession(ADMIN_COOKIE);
  if (!id) return null;
  return prisma.adminUser.findUnique({ where: { id }, select: { id: true, email: true, name: true } });
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
