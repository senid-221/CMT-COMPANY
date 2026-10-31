import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatMoney, formatUnits } from '@/lib/money';
import { isCurrency } from '@/lib/markets';
import { ORDER_STATUSES } from '@/lib/pricing';
import { setOrderStatus } from '@/app/admin/actions';
import { BackLink, Flash, StatusPill, formatDate } from '@/components/admin/ui';

const SLOT_LABEL: Record<string, string> = { express: 'Express (25–40 min)', today: 'Today (2–4 h)', morning: 'Tomorrow morning' };
const STATUS_LABEL: Record<string, string> = {
  placed: 'Received',
  packing: 'Packing',
  onWay: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const PAYMENT_LABEL: Record<string, string> = { cod: 'Cash on delivery', card: 'Card', mtn: 'MTN Mobile Money', orange: 'Orange Money', wave: 'Wave', bank: 'Bank transfer' };
const PAYMENT_STATUS_LABEL: Record<string, string> = { unpaid: 'Payment due', pending: 'Awaiting payment', paid: 'Paid', failed: 'Payment failed' };
const MARKET_LABEL: Record<string, string> = { RW: 'Rwanda (RWF)', SN: 'Senegal (XOF)', INT: 'International (USD)' };

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: { select: { handle: true } } } } },
  });
  if (!order) notFound();

  const charged =
    order.paymentAmount === null
      ? null
      : isCurrency(order.paymentCurrency)
        ? formatUnits(order.paymentAmount, 'en', order.paymentCurrency)
        : formatMoney(order.paymentAmount, 'en');

  return (
    <div>
      <BackLink href="/admin/orders">All orders</BackLink>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">{order.number}</h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDate(order.placedAt)}</p>
        </div>
        <StatusPill status={order.status} />
      </div>

      <Flash saved={saved} error={error} />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-lg font-semibold">Items</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5 text-center">Qty</th>
                <th className="px-4 py-2.5 text-right">Unit</th>
                <th className="px-4 py-2.5 text-right">Line</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    {item.product ? (
                      <Link href={`/admin/products/${item.productId}/edit`} className="font-semibold hover:text-brand hover:underline">
                        {item.productName}
                      </Link>
                    ) : (
                      <span className="font-semibold">{item.productName}</span>
                    )}
                    <p className="text-xs text-muted">{item.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(item.unitPriceCents, 'en')}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.lineTotalCents, 'en')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1.5 border-t border-line px-4 py-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotalCents, 'en')}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Delivery</span>
              <span>{order.deliveryFeeCents ? formatMoney(order.deliveryFeeCents, 'en') : 'Free'}</span>
            </div>
            {order.discountCents > 0 ? (
              <div className="flex justify-between text-muted">
                <span>Coupon {order.couponCode}</span>
                <span>−{formatMoney(order.discountCents, 'en')}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-display text-base font-bold">
              <span>Total</span>
              <span>{formatMoney(order.totalCents, 'en')}</span>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-2 font-display text-lg font-semibold">Customer</h2>
            <p className="font-semibold">{order.customerName}</p>
            <p className="text-sm text-muted">
              <a href={`tel:${order.phone}`} className="hover:text-brand">
                {order.phone}
              </a>
            </p>
            {order.email ? <p className="text-sm text-muted">{order.email}</p> : null}
            <p className="mt-2 text-sm">{order.addressLine}</p>
            <p className="text-sm text-muted">{order.city}</p>
            {order.deliveryNote ? <p className="mt-2 rounded-lg bg-surface-alt p-2 text-sm">Note: {order.deliveryNote}</p> : null}
          </section>

          <section className="card p-4">
            <h2 className="mb-2 font-display text-lg font-semibold">Delivery</h2>
            <p className="text-sm">{SLOT_LABEL[order.slot] ?? order.slot}</p>
            <p className="text-sm text-muted">
              Payment: {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod} · {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
            </p>
            {order.market ? <p className="text-sm text-muted">Market: {MARKET_LABEL[order.market] ?? order.market}</p> : null}
            {charged ? (
              <p className="text-sm text-muted">
                Charged {charged}
                {order.paidAt ? ` on ${formatDate(order.paidAt)}` : ''}
              </p>
            ) : null}
            {order.paymentTransactionId ? <p className="text-xs text-muted">Flutterwave tx {order.paymentTransactionId}</p> : null}
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-display text-lg font-semibold">Update status</h2>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map((status) => (
                <form key={status} action={setOrderStatus}>
                  <input type="hidden" name="id" value={order.id} />
                  <input type="hidden" name="status" value={status} />
                  <input type="hidden" name="returnTo" value={`/admin/orders/${order.id}`} />
                  <button
                    type="submit"
                    disabled={status === order.status}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      status === order.status
                        ? 'border-line bg-surface text-muted'
                        : status === 'cancelled'
                          ? 'border-danger/40 text-danger hover:bg-danger/10'
                          : 'border-line hover:border-brand hover:text-brand'
                    }`}
                  >
                    {STATUS_LABEL[status] ?? status}
                  </button>
                </form>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Cancelling an order returns its items to stock. Reopening a cancelled order reserves stock again.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
