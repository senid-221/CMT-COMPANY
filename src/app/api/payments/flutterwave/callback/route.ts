import { NextResponse } from 'next/server';
import { markPaymentFailed, paymentOrderNumber, settlePayment } from '@/lib/payments';
import { invoiceByReference, markStorefrontInvoiceFailed, settleStorefrontInvoice } from '@/lib/vendor-billing';
import { publicOrigin } from '@/lib/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function back(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, publicOrigin(request.url)));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const status = (params.get('status') ?? '').toLowerCase();
  const txRef = (params.get('tx_ref') ?? '').trim();
  const transactionId = (params.get('transaction_id') ?? '').trim();

  if (!txRef) return back(request, '/');

  if (await invoiceByReference(txRef)) {
    if (status !== 'successful' || !transactionId) {
      await markStorefrontInvoiceFailed(txRef);
      return back(request, '/seller/billing?failed=1');
    }
    try {
      const result = await settleStorefrontInvoice({ reference: txRef, transactionId });
      return back(request, `/seller/billing?${result.state === 'paid' ? 'paid=1' : 'failed=1'}`);
    } catch {
      return back(request, '/seller/billing?failed=1');
    }
  }

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
