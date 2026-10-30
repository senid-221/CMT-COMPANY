import Link from 'next/link';
import { prisma } from '@/lib/db';
import { setSellerStatus } from '@/app/admin/actions';
import { Flash, PageHeader, StatusPill, formatDate } from '@/components/admin/ui';

const TABS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default async function AdminSellersPage({ searchParams }: { searchParams: Promise<{ status?: string; saved?: string; error?: string }> }) {
  const { status = '', saved, error } = await searchParams;
  const filter = ['new', 'approved', 'rejected'].includes(status) ? status : '';

  const [sellers, counts, accounts] = await Promise.all([
    prisma.sellerApplication.findMany({
      where: filter ? { status: filter } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.sellerApplication.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.seller.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { products: true } } },
    }),
  ]);

  const countOf = (value: string) => counts.find((row) => row.status === value)?._count._all ?? 0;

  return (
    <div>
      <PageHeader title="Sellers" description="Seller accounts and applications from the Become a Seller page." />

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Seller accounts ({accounts.length})</h2>
        {accounts.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {accounts.map((account) => (
              <li key={account.id} className="card p-4">
                <h3 className="font-display text-lg font-semibold">{account.name}</h3>
                <p className="mt-1 break-all text-sm text-muted">{account.email}</p>
                {account.phone ? <p className="text-sm text-muted">{account.phone}</p> : null}
                <p className="mt-2 text-xs font-semibold text-brand">{account._count.products} product(s)</p>
                <p className="mt-1 text-xs text-muted">Joined {formatDate(account.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card px-4 py-6 text-center text-sm text-muted">No seller account yet. Run npm run db:seller to create one.</p>
        )}
      </section>

      <h2 className="mb-3 font-display text-lg font-semibold">Applications</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value || 'all'}
            href={tab.value ? `/admin/sellers?status=${tab.value}` : '/admin/sellers'}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              filter === tab.value ? 'border-brand bg-brand text-white' : 'border-line bg-canvas hover:border-brand'
            }`}
          >
            {tab.label}
            {tab.value ? ` (${countOf(tab.value)})` : ''}
          </Link>
        ))}
      </div>

      <Flash saved={saved} error={error} />

      {sellers.length ? (
        <ul className="space-y-3">
          {sellers.map((seller) => (
            <li key={seller.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{seller.storeName}</h2>
                    <StatusPill status={seller.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {seller.contactName} · {seller.phone} · {seller.city}
                  </p>
                  <p className="mt-1 text-sm">Sells: {seller.categories}</p>
                  {seller.message ? <p className="mt-2 rounded-lg bg-surface-alt p-2 text-sm">{seller.message}</p> : null}
                  <p className="mt-2 text-xs text-muted">
                    Applied {formatDate(seller.createdAt)} · {seller.id}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {seller.status !== 'approved' ? (
                    <form action={setSellerStatus}>
                      <input type="hidden" name="id" value={seller.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button type="submit" className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">
                        Approve
                      </button>
                    </form>
                  ) : null}
                  {seller.status !== 'rejected' ? (
                    <form action={setSellerStatus}>
                      <input type="hidden" name="id" value={seller.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button type="submit" className="rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10">
                        Reject
                      </button>
                    </form>
                  ) : null}
                  {seller.status !== 'new' ? (
                    <form action={setSellerStatus}>
                      <input type="hidden" name="id" value={seller.id} />
                      <input type="hidden" name="status" value="new" />
                      <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-brand hover:text-brand">
                        Reopen
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card px-4 py-8 text-center text-sm text-muted">No application in this view.</p>
      )}
    </div>
  );
}
