import './load-env.mjs';
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? '';
const name = (process.env.ADMIN_NAME ?? 'Administrator').trim() || 'Administrator';

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.');
  process.exit(1);
}
if (password.length < 10) {
  console.error('ADMIN_PASSWORD must be at least 10 characters.');
  process.exit(1);
}
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  console.warn('Warning: AUTH_SECRET is missing or shorter than 32 characters — admin login will be disabled until it is set.');
}

const salt = randomBytes(16).toString('hex');
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;

const prisma = new PrismaClient();
try {
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
    select: { id: true, email: true },
  });
  console.log(`admin ready: ${admin.email} (${admin.id})`);
} finally {
  await prisma.$disconnect();
}
