import { NextResponse } from 'next/server';
import { settlePayment, webhookHashMatches } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!webhookHashMatches(request.headers.get('verif-hash'))) {
    return NextResponse.json({ error: 'invalid-signature' }, { status: 401 });
  }

  let body: { event?: string; data?: { id?: number | string; tx_ref?: string; status?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  if (body?.event !== 'charge.completed') return NextResponse.json({ received: true });

  const txRef = String(body.data?.tx_ref ?? '').trim();
  const transactionId = String(body.data?.id ?? '').trim();
  if (!txRef || !transactionId || String(body.data?.status) !== 'successful') {
    return NextResponse.json({ received: true });
  }

  try {
    await settlePayment({ txRef, transactionId });
  } catch {
    return NextResponse.json({ error: 'verify-failed' }, { status: 502 });
  }
  return NextResponse.json({ received: true });
}
