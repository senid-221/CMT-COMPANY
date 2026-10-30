import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clientIp, rateLimited } from '@/lib/rate-limit';
import { isOnlineMethod } from '@/lib/payment-methods';
import { paymentRedirectUrl, startOrderPayment } from '@/lib/payments';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (rateLimited(`order-pay:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });
  }

  let body: { number?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const number = String(body.number ?? '').trim().toUpperCase().slice(0, 20);
  const phone = String(body.phone ?? '').trim().slice(0, 20);
  if (!number || !phone) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { number } });
  const samePhone = order && order.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '');
  if (!order || !samePhone) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  if (!isOnlineMethod(order.paymentMethod)) return NextResponse.json({ error: 'cash-only' }, { status: 400 });
  if (order.paymentStatus === 'paid') return NextResponse.json({ error: 'already-paid' }, { status: 409 });
  if (order.status === 'cancelled') return NextResponse.json({ error: 'cancelled' }, { status: 409 });

  try {
    const url = await startOrderPayment({
      number: order.number,
      totalCents: order.totalCents,
      customerName: order.customerName,
      email: order.email,
      phone: order.phone,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      redirectUrl: paymentRedirectUrl(request),
    });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof Error && error.message === 'payment-not-configured') {
      return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: 'paid' } },
      data: { paymentStatus: 'failed' },
    });
    return NextResponse.json({ error: 'gateway' }, { status: 502 });
  }
}
