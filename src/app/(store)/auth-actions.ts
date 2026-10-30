'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { clientIpFromHeaders, rateLimited } from '@/lib/rate-limit';
import { endCustomerSession, startCustomerSession } from '@/lib/customer/auth';
import { claimGuestOrders } from '@/lib/customer/orders';

export type AuthState = { error: 'invalid' | 'exists' | 'google-account' | 'bad-email' | 'short-password' | 'too-many' | 'failed' | null };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loginCustomer(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 120);
  const password = String(formData.get('password') ?? '').slice(0, 200);
  const ip = clientIpFromHeaders(await headers());

  if (rateLimited(`customer-login:${ip}`, 10, 15 * 60_000)) return { error: 'too-many' };
  if (!email || !password) return { error: 'invalid' };

  const customer = await prisma.customer.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  const valid = customer?.passwordHash ? verifyPassword(password, customer.passwordHash) : false;
  if (!customer || !valid) {
    await sleep(350);
    return { error: 'invalid' };
  }

  await claimGuestOrders(customer.id, email);
  await prisma.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } });
  await startCustomerSession(customer.id);
  redirect('/account');
}

export async function signupCustomer(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get('name') ?? '').trim().slice(0, 80);
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 120);
  const phone = String(formData.get('phone') ?? '').trim().slice(0, 20);
  const password = String(formData.get('password') ?? '').slice(0, 200);
  const ip = clientIpFromHeaders(await headers());

  if (rateLimited(`customer-signup:${ip}`, 8, 15 * 60_000)) return { error: 'too-many' };
  if (!EMAIL.test(email)) return { error: 'bad-email' };
  if (password.length < 8) return { error: 'short-password' };
  if (name.length < 2) return { error: 'invalid' };

  const existing = await prisma.customer.findUnique({ where: { email }, select: { id: true, googleId: true, passwordHash: true } });
  if (existing) return { error: existing.googleId && !existing.passwordHash ? 'google-account' : 'exists' };

  let customerId: string;
  try {
    const created = await prisma.customer.create({
      data: { name, email, phone: phone || null, passwordHash: hashPassword(password) },
      select: { id: true },
    });
    customerId = created.id;
  } catch {
    return { error: 'failed' };
  }

  await claimGuestOrders(customerId, email);
  await startCustomerSession(customerId);
  redirect('/account');
}

export async function logoutCustomer() {
  await endCustomerSession();
  redirect('/login');
}
