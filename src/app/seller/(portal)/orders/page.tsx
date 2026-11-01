import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireSeller } from '@/lib/seller/auth';
import { formatMoney } from '@/lib/money';

export const metadata = { title: 'Vendor orders', robots: { index: false, follow: false } };

const STATUS_LABEL: Record<string, string> = {
  split: 'Paid to your subaccount',
  pending: 'Awaiting payout',
  paid: 'Paid out',
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

export default async function VendorOrdersPage() {
  const seller = await requireSeller();
  const settlements = await prisma.vendorSettlement.findMany({
    where: { sellerId: seller.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      amountCents: true,
      status: true,
      ratio: true,
      createdAt: true,
      order: { select: { number: true, paymentStatus: true, placedAt: true } },
    },
  });

  const total = settlements.reduce((sum, row) => sum + row.amountCents, 0);
  const awaiting = settlements.filter((row) => row.status === 'pending').reduce((sum, row) => sum + row.amountCents, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Orders</h1>
          <p className="mt-1 text-sm text-muted">Your share of each order, after coupon discounts and before delivery fees.</p>
        </div>
        {!seller.subaccountId ? (
          <Link href="/seller/settings" className="btn btn-ghost text-sm">
            Add payout subaccount
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Orders</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{settlements.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total sales</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{formatMoney(total, 'en')}</p>
        </div>
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Awaiting payout</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{formatMoney(awaiting, 'en')}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-canvas">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer payment</th>
              <th className="px-4 py-3 text-right">Your share</th>
              <th className="px-4 py-3">Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {settlements.map((row) => (
              <tr key={row.id} className="hover:bg-surface-alt">
                <td className="px-4 py-3 font-semibold text-ink">{row.order.number}</td>
                <td className="px-4 py-3 text-muted">{formatDate(row.order.placedAt)}</td>
                <td className="px-4 py-3 text-muted">{row.order.paymentStatus}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink">{formatMoney(row.amountCents, 'en')}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.status === 'split' || row.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {settlements.length ? null : (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted">No order with your products yet.</p>
            <Link href="/shop" className="btn btn-ghost mt-4">
              View the shop
            </Link>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Card and mobile money orders are split to your Flutterwave subaccount as soon as the customer pays. Cash on
        delivery orders are collected by the rider and marked paid out after settlement.
      </p>
    </div>
  );
}
