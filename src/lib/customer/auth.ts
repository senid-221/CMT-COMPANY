import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { clearSession, readSession, writeSession } from '@/lib/session';

const CUSTOMER_COOKIE = 'cmb_customer';
const SESSION_MS = 30 * 24 * 3_600_000;

export type Customer = { id: string; email: string; name: string; phone: string | null; createdAt: Date };

export async function startCustomerSession(customerId: string) {
  await writeSession(CUSTOMER_COOKIE, customerId, SESSION_MS);
}

export async function endCustomerSession() {
  await clearSession(CUSTOMER_COOKIE);
}

export async function getCustomer(): Promise<Customer | null> {
  const id = await readSession(CUSTOMER_COOKIE);
  if (!id) return null;
  return prisma.customer.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  });
}

export async function requireCustomer(): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) redirect('/login');
  return customer;
}
