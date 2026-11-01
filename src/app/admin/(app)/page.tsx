import Link from 'next/link';
import { prisma } from '@/lib/db';
import { visitorStats } from '@/lib/analytics';
import { formatMoney } from '@/lib/money';
import { PageHeader, StatusPill, formatDate } from '@/components/admin/ui';

export default async function AdminOverviewPage() {
  const [orders, openOrders, delivered, products, lowStock, pendingReviews, newSellers, recent, reviews, visitors] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ['placed', 'packing', 'onWay'] } } }),
    prisma.order.aggregate({ where: { status: 'delivered' }, _sum: { totalCents: true } }),
    prisma.product.count(),
    prisma.product.count({ where: { stock: { lte: 10 } } }),
    prisma.review.count({ where: { status: 'pending' } }),
    prisma.sellerApplication.count({ where: { status: 'new' } }),
    prisma.order.findMany({ orderBy: { placedAt: 'desc' }, take: 6, select: { id: true, number: true, customerName: true, totalCents: true, status: true, placedAt: true } }),
    prisma.review.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, author: true, rating: true, product: { select: { name: true, handle: true } } } }),
    visitorStats(7),
  ]);

  const cards = [
    { label: 'Delivered revenue', value: formatMoney(delivered._sum.totalCents ?? 0, 'en'), hint: 'Delivered orders, cash or online', href: '/admin/orders?status=delivered' },
    { label: 'Orders', value: String(orders), hint: `${openOrders} open`, href: '/admin/orders' },
    { label: 'Products', value: String(products), hint: `${lowStock} at or below 10 units`, href: '/admin/products' },
    { label: 'Visitors (7 days)', value: String(visitors.totals.visitors), hint: `${visitors.totals.views} page views`, href: '/admin/visitors' },
    { label: 'Reviews to moderate', value: String(pendingReviews), hint: 'Waiting for approval', href: '/admin/reviews' },
    { label: 'Vendor applications', value: String(newSellers), hint: 'Waiting for review', href: '/admin/sellers' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Store health at a glance." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="card p-4 transition hover:border-brand">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-display text-lg font-semibold">Latest orders</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-brand hover:underline">
              All orders →
            </Link>
          </div>
          {recent.length ? (
            <div className="divide-y divide-line">
              {recent.map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-hover">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {order.number} · {order.customerName}
                    </p>
                    <p className="text-xs text-muted">{formatDate(order.placedAt)}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatMoney(order.totalCents, 'en')}</span>
                  <StatusPill status={order.status} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-muted">No orders yet.</p>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-display text-lg font-semibold">Reviews waiting</h2>
            <Link href="/admin/reviews" className="text-sm font-semibold text-brand hover:underline">
              Moderate →
            </Link>
          </div>
          {reviews.length ? (
            <ul className="divide-y divide-line">
              {reviews.map((review) => (
                <li key={review.id} className="px-4 py-3">
                  <p className="text-sm font-semibold">
                    <span className="text-amber">{'★'.repeat(review.rating)}</span> {review.product.name}
                  </p>
                  <p className="text-xs text-muted">
                    {review.author} · {review.product.handle}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted">Nothing to moderate.</p>
          )}
        </section>
      </div>
    </div>
  );
}
