import Link from 'next/link';
import { prisma } from '@/lib/db';
import { deleteCoupon, toggleCoupon } from '@/app/admin/coupons/actions';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { EmptyRow, Flash, PageHeader, formatDate } from '@/components/admin/ui';
import { formatMoney } from '@/lib/money';

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const { saved, deleted, error } = await searchParams;
  const coupons = await prisma.coupon.findMany({ orderBy: [{ active: 'desc' }, { createdAt: 'desc' }], take: 200 });

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Promo codes shoppers can enter at checkout, and the animated ads that advertise them on the home page."
        action={
          <Link href="/admin/coupons/new" className="btn btn-primary">
            New coupon
          </Link>
        }
      />

      <Flash saved={saved} deleted={deleted} error={error} />

      {coupons.length ? (
        <ul className="space-y-3">
          {coupons.map((coupon) => {
            const headline =
              coupon.kind === 'amount'
                ? `${formatMoney(coupon.amountCents ?? 0, 'en')} off`
                : `${coupon.percent ?? 0}% off`;
            const live = coupon.active && (!coupon.endsAt || coupon.endsAt > new Date()) && (coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit);
            return (
              <li key={coupon.id} className="card flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-line bg-surface-alt px-2.5 py-1 font-display text-sm font-bold tracking-wide">{coupon.code}</span>
                    <span className="font-semibold text-brand">{headline}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${live ? 'bg-success/10 text-success' : 'bg-surface text-muted'}`}>
                      {coupon.active ? (live ? 'Live' : 'Not live') : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">
                    {coupon.label}
                    {coupon.labelFr ? <span className="text-muted"> · {coupon.labelFr}</span> : null}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {coupon.minSubtotalCents > 0 ? `Min. cart ${formatMoney(coupon.minSubtotalCents, 'en')} · ` : ''}
                    {coupon.maxDiscountCents != null ? `Capped at ${formatMoney(coupon.maxDiscountCents, 'en')} · ` : ''}
                    {coupon.markets ? `Countries ${coupon.markets} · ` : 'All countries · '}
                    {coupon.usageLimit == null
                      ? `${coupon.usedCount} uses`
                      : `${coupon.usedCount}/${coupon.usageLimit} uses`}
                    {coupon.endsAt ? ` · ends ${formatDate(coupon.endsAt)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/coupons/${coupon.id}/edit`} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-brand hover:text-brand">
                    Edit
                  </Link>
                  <form action={toggleCoupon}>
                    <input type="hidden" name="id" value={coupon.id} />
                    <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-brand hover:text-brand">
                      {coupon.active ? 'Pause' : 'Activate'}
                    </button>
                  </form>
                  <form action={deleteCoupon}>
                    <input type="hidden" name="id" value={coupon.id} />
                    <ConfirmButton
                      message={`Delete ${coupon.code}? Orders that already used it keep their record.`}
                      className="rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyRow>No coupons yet. Create one to start advertising it on the home page.</EmptyRow>
      )}
    </div>
  );
}
