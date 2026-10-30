import { NextResponse } from 'next/server';
import { markPaymentFailed, paymentOrderNumber, settlePayment } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function back(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const status = (params.get('status') ?? '').toLowerCase();
  const txRef = (params.get('tx_ref') ?? '').trim();
  const transactionId = (params.get('transaction_id') ?? '').trim();

  if (!txRef) return back(request, '/');

  if (status !== 'successful' || !transactionId) {
    const number = await markPaymentFailed(txRef);
    return back(request, number ? `/order/${number}?pay=failed` : '/');
  }

  try {
    const result = await settlePayment({ txRef, transactionId });
    if (result.state === 'unknown') return back(request, '/');
    return back(request, `/order/${result.number}?paid=${result.state === 'paid' ? '1' : '0'}`);
  } catch {
    const number = await paymentOrderNumber(txRef);
    return back(request, number ? `/order/${number}?pay=failed` : '/');
  }
}
