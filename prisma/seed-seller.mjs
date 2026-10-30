import './load-env.mjs';
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const email = (process.env.SELLER_EMAIL ?? '').trim().toLowerCase();
const password = process.env.SELLER_PASSWORD ?? '';
const name = (process.env.SELLER_NAME ?? 'HighQuality Ltd').trim() || 'HighQuality Ltd';

if (!email || !password) {
  console.error('Set SELLER_EMAIL and SELLER_PASSWORD before running this script.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('SELLER_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;

const prisma = new PrismaClient();
try {
  const seller = await prisma.seller.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
    select: { id: true, email: true, name: true },
  });
  const assigned = await prisma.product.updateMany({ where: { sellerId: null }, data: { sellerId: seller.id } });
  console.log(`seller ready: ${seller.name} <${seller.email}> (${seller.id})`);
  console.log(`assigned ${assigned.count} unowned product(s) to this seller`);
} finally {
  await prisma.$disconnect();
}
