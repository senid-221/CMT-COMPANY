import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clientIp, rateLimited } from '@/lib/rate-limit';
import { paymentStatusValue } from '@/lib/payment-methods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lets the order page watch a mobile-money approval settle without reloading. Proof of ownership is number + phone. */
export async function GET(request: Request) {
  if (rateLimited(`order-status:${clientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const number = (params.get('number') ?? '').trim().toUpperCase().slice(0, 20);
  const phone = (params.get('phone') ?? '').trim().slice(0, 20);
  if (!number || !phone) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { number },
    select: { status: true, paymentStatus: true, paymentMethod: true, phone: true },
  });
  if (!order || order.phone.replace(/\s+/g, '') !== phone.replace(/\s+/g, '')) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  return NextResponse.json(
    { status: order.status, paymentMethod: order.paymentMethod, paymentStatus: paymentStatusValue(order.paymentStatus) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
