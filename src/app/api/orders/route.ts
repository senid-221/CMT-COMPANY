import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOrder, type CreateOrderInput } from '@/lib/orders';
import { getCustomer } from '@/lib/customer/auth';
import { clientIp, rateLimited } from '@/lib/rate-limit';
import { isOnlineMethod, isPaymentMethod } from '@/lib/payment-methods';
import { startOrderPayment, paymentRedirectUrl } from '@/lib/payments';

export const runtime = 'nodejs';

const LIMIT = 6;
const WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (rateLimited(ip, LIMIT, WINDOW_MS)) return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });

  const lengthHeader = Number(request.headers.get('content-length') ?? '0');
  if (lengthHeader > 64_000) return NextResponse.json({ error: 'payload-too-large' }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const input = body as Partial<CreateOrderInput>;
  const customer = await getCustomer();
  const paymentMethod = isPaymentMethod(input.paymentMethod) ? input.paymentMethod : 'cod';
  const result = await createOrder({
    lines: Array.isArray(input.lines) ? input.lines.slice(0, 100) : [],
    customerName: typeof input.customerName === 'string' ? input.customerName : '',
    phone: typeof input.phone === 'string' ? input.phone : '',
    email: typeof input.email === 'string' ? input.email : null,
    addressLine: typeof input.addressLine === 'string' ? input.addressLine : '',
    city: typeof input.city === 'string' ? input.city : '',
    deliveryNote: typeof input.deliveryNote === 'string' ? input.deliveryNote : null,
    slot: input.slot as CreateOrderInput['slot'],
    paymentMethod,
    customerId: customer?.id ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  let paymentUrl: string | null = null;
  let paymentError = false;
  if (isOnlineMethod(result.paymentMethod)) {
    try {
      paymentUrl = await startOrderPayment({
        number: result.number,
        totalCents: result.totalCents,
        customerName: typeof input.customerName === 'string' ? input.customerName.trim().slice(0, 80) : '',
        email: typeof input.email === 'string' && input.email.trim() ? input.email.trim().toLowerCase().slice(0, 120) : null,
        phone: typeof input.phone === 'string' ? input.phone.trim().slice(0, 20) : '',
        paymentMethod: result.paymentMethod,
        paymentStatus: 'pending',
        status: 'placed',
        redirectUrl: paymentRedirectUrl(request),
      });
    } catch {
      paymentError = true;
      await prisma.order.updateMany({ where: { number: result.number }, data: { paymentStatus: 'failed' } });
    }
  }

  return NextResponse.json({ number: result.number, totalCents: result.totalCents, paymentUrl, paymentError }, { status: 201 });
}
