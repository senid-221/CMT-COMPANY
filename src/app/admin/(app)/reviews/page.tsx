import Link from 'next/link';
import { prisma } from '@/lib/db';
import { deleteReview, setReviewStatus } from '@/app/admin/actions';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { Flash, PageHeader, StatusPill, formatDate } from '@/components/admin/ui';

const TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string; saved?: string; deleted?: string; error?: string }> }) {
  const { status = '', saved, deleted, error } = await searchParams;
  const filter = ['pending', 'approved', 'rejected'].includes(status) ? status : '';

  const [reviews, counts] = await Promise.all([
    prisma.review.findMany({
      where: filter ? { status: filter } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      select: {
        id: true,
        author: true,
        rating: true,
        body: true,
        status: true,
        createdAt: true,
        product: { select: { name: true, handle: true } },
      },
    }),
    prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const countOf = (value: string) => counts.find((row) => row.status === value)?._count._all ?? 0;

  return (
    <div>
      <PageHeader title="Reviews" description="Approve or reject customer reviews before they appear on product pages." />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value || 'all'}
            href={tab.value ? `/admin/reviews?status=${tab.value}` : '/admin/reviews'}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              filter === tab.value ? 'border-brand bg-brand text-white' : 'border-line bg-canvas hover:border-brand'
            }`}
          >
            {tab.label}
            {tab.value ? ` (${countOf(tab.value)})` : ''}
          </Link>
        ))}
      </div>

      <Flash saved={saved} deleted={deleted} error={error} />

      {reviews.length ? (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-amber" aria-label={`${review.rating} out of 5`}>
                      {'★'.repeat(review.rating)}
                      <span className="text-muted">{'★'.repeat(5 - review.rating)}</span>
                    </span>
                    <StatusPill status={review.status} />
                  </div>
                  <Link href={`/product/${review.product.handle}`} target="_blank" className="mt-1 block font-semibold hover:text-brand hover:underline">
                    {review.product.name} ↗
                  </Link>
                  <p className="text-xs text-muted">
                    {review.author} · {formatDate(review.createdAt)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{review.body}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.status !== 'approved' ? (
                    <form action={setReviewStatus}>
                      <input type="hidden" name="id" value={review.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button type="submit" className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">
                        Approve
                      </button>
                    </form>
                  ) : null}
                  {review.status !== 'rejected' ? (
                    <form action={setReviewStatus}>
                      <input type="hidden" name="id" value={review.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-danger hover:text-danger">
                        Reject
                      </button>
                    </form>
                  ) : null}
                  <form action={deleteReview}>
                    <input type="hidden" name="id" value={review.id} />
                    <ConfirmButton
                      message="Delete this review permanently?"
                      className="rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card px-4 py-8 text-center text-sm text-muted">No review in this view.</p>
      )}
    </div>
  );
}
