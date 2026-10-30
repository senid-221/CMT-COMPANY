import { prisma } from '@/lib/db';

export async function claimGuestOrders(customerId: string, email: string) {
  await prisma.order.updateMany({ where: { email, customerId: null }, data: { customerId } });
}
