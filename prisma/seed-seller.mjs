import './load-env.mjs';
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const email = (process.env.SELLER_EMAIL ?? '').trim().toLowerCase();
const password = process.env.SELLER_PASSWORD ?? '';
const name = (process.env.SELLER_NAME ?? 'HighQuality Ltd').trim() || 'HighQuality Ltd';
const handle = (process.env.SELLER_HANDLE ?? 'highquality').trim().toLowerCase();
const storefrontDays = Number(process.env.SELLER_STOREFRONT_DAYS ?? 365);
const feeRwf = Number(process.env.SELLER_FEE_RWF ?? 20000);

if (!email || !password) {
  console.error('Set SELLER_EMAIL and SELLER_PASSWORD before running this script.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('SELLER_PASSWORD must be at least 8 characters.');
  process.exit(1);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)) {
  console.error('SELLER_HANDLE must be lowercase letters, numbers and dashes.');
  process.exit(1);
}
if (!Number.isFinite(storefrontDays) || storefrontDays < 1 || storefrontDays > 3650) {
  console.error('SELLER_STOREFRONT_DAYS must be between 1 and 3650.');
  process.exit(1);
}
if (!Number.isInteger(feeRwf) || feeRwf < 1000) {
  console.error('SELLER_FEE_RWF must be at least 1000.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
const storefrontUntil = new Date(Date.now() + storefrontDays * 86_400_000);

const prisma = new PrismaClient();
try {
  const seller = await prisma.seller.upsert({
    where: { email },
    update: { passwordHash, name, handle, storefrontUntil, feeRwf },
    create: { email, passwordHash, name, handle, storefrontUntil, feeRwf, city: 'Kigali' },
    select: { id: true, email: true, name: true, handle: true, storefrontUntil: true },
  });
  const assigned = await prisma.product.updateMany({ where: { sellerId: null }, data: { sellerId: seller.id } });
  console.log(`vendor ready: ${seller.name} <${seller.email}> /store/${seller.handle}`);
  console.log(`storefront active until ${seller.storefrontUntil.toISOString().slice(0, 10)} at RWF ${feeRwf}/month`);
  console.log(`assigned ${assigned.count} unowned product(s) to this vendor`);
} finally {
  await prisma.$disconnect();
}
