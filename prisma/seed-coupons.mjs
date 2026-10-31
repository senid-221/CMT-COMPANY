import './load-env.mjs';
import { PrismaClient } from '@prisma/client';

const DAYS = 24 * 60 * 60 * 1000;
const now = Date.now();

const COUPONS = [
  {
    code: 'WELCOME10',
    kind: 'percent',
    percent: 10,
    amountCents: null,
    minSubtotalCents: 1500,
    maxDiscountCents: 800,
    markets: '',
    startsAt: null,
    endsAt: new Date(now + 30 * DAYS),
    usageLimit: null,
    active: true,
    label: 'First order discount',
    labelFr: 'Réduction première commande',
  },
  {
    code: 'FRESH500',
    kind: 'amount',
    percent: null,
    amountCents: 500,
    minSubtotalCents: 3000,
    maxDiscountCents: null,
    markets: 'RW, SN',
    startsAt: null,
    endsAt: new Date(now + 7 * DAYS),
    usageLimit: 200,
    active: true,
    label: 'Market basket saver',
    labelFr: 'Économies sur le panier',
  },
];

const prisma = new PrismaClient();
try {
  for (const coupon of COUPONS) {
    await prisma.coupon.upsert({ where: { code: coupon.code }, update: coupon, create: coupon });
    console.log(`coupon ${coupon.code} ready`);
  }
} finally {
  await prisma.$disconnect();
}
