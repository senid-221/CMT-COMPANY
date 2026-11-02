import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clientIp, rateLimited } from '@/lib/rate-limit';
import { isOnlineMethod, isPaymentMethod } from '@/lib/payment-methods';
import { offeredRails } from '@/lib/markets';
import { resolveMarket } from '@/lib/market';
import { paymentConfig, paymentRedirectUrl, startOrderPayment } from '@/lib/payments';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (rateLimited(`order-pay:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });
  }

  let body: { number?: unknown; phone?: unknown; method?: unknown };
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
  if (order.paymentStatus === 'paid') return NextResponse.json({ error: 'already-paid' }, { status: 409 });
  if (order.status === 'cancelled') return NextResponse.json({ error: 'cancelled' }, { status: 409 });

  let method = order.paymentMethod;
  if (!isOnlineMethod(method)) {
    // A cash or bank order can still be paid online: the shopper picks a rail their own market offers.
    const picked = isPaymentMethod(body.method) && isOnlineMethod(body.method) ? body.method : null;
    if (!picked) return NextResponse.json({ error: 'need-method' }, { status: 400 });
    const allowed = offeredRails(resolveMarket(order.market).methods, paymentConfig().rails).filter(isOnlineMethod);
    if (!allowed.includes(picked)) return NextResponse.json({ error: 'method-unavailable' }, { status: 422 });

    method = picked;
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { paymentMethod: picked, paymentCurrency: null, paymentAmount: null },
      }),
      // The gateway splits this payment, so these rows must stop waiting for a manual payout.
      prisma.vendorSettlement.updateMany({
        where: { orderId: order.id, subaccountId: { not: null }, status: 'pending' },
        data: { status: 'split' },
      }),
    ]);
  }

  try {
    const url = await startOrderPayment({
      number: order.number,
      totalCents: order.totalCents,
      customerName: order.customerName,
      email: order.email,
      phone: order.phone,
      paymentMethod: method,
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
