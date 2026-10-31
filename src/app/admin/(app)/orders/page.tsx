import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { ORDER_STATUSES } from '@/lib/pricing';
import { Flash, PageHeader, StatusPill, formatDate } from '@/components/admin/ui';

type Params = { q?: string; status?: string; saved?: string; error?: string };

const SLOT_LABEL: Record<string, string> = { express: 'Express', today: 'Today', morning: 'Tomorrow morning' };
const STATUS_LABEL: Record<string, string> = {
  placed: 'Received',
  packing: 'Packing',
  onWay: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const PAYMENT_LABEL: Record<string, string> = { cod: 'Cash on delivery', card: 'Card', mtn: 'MTN MoMo', orange: 'Orange Money', wave: 'Wave', bank: 'Bank transfer' };
const PAYMENT_STATUS_LABEL: Record<string, string> = { unpaid: 'Payment due', pending: 'Pending', paid: 'Paid', failed: 'Failed' };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = '', status = '', saved, error } = await searchParams;
  const term = q.trim().slice(0, 60);
  const statusFilter = (ORDER_STATUSES as readonly string[]).includes(status) ? status : '';

  const orders = await prisma.order.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(term
        ? {
            OR: [
              { number: { contains: term.toUpperCase() } },
              { customerName: { contains: term } },
              { phone: { contains: term } },
            ],
          }
        : {}),
    },
    orderBy: { placedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      number: true,
      customerName: true,
      phone: true,
      city: true,
      totalCents: true,
      status: true,
      slot: true,
      paymentMethod: true,
      paymentStatus: true,
      placedAt: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Orders" description="Track, update and close every order." />

      <form method="get" action="/admin/orders" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={term} placeholder="Number, name or phone" className="field" />
        </div>
        <div className="min-w-40">
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={statusFilter} className="field">
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value] ?? value}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary px-6">
          Filter
        </button>
        <p className="text-sm text-muted">{orders.length} order(s)</p>
      </form>

      <Flash saved={saved} error={error} />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Delivery</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Placed</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-hover">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-semibold text-brand hover:underline">
                    {order.number}
                  </Link>
                  <p className="text-xs text-muted">{order._count.items} item(s)</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-xs text-muted">{order.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{order.city}</p>
                  <p className="text-xs text-muted">{SLOT_LABEL[order.slot] ?? order.slot}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
                  <p className="text-xs text-muted">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(order.placedAt)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(order.totalCents, 'en')}</td>
                <td className="px-4 py-3">
                  <StatusPill status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length ? null : <p className="px-4 py-8 text-center text-sm text-muted">No order matches this filter.</p>}
      </div>
    </div>
  );
}
