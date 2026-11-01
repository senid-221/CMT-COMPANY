import Link from 'next/link';
import { prisma } from '@/lib/db';
import { markVendorSettlementPaid, setSellerStatus, updateVendorStorefront } from '@/app/admin/actions';
import { Flash, PageHeader, StatusPill, formatDate } from '@/components/admin/ui';
import { formatMoney } from '@/lib/money';
import { storefrontStatus } from '@/lib/vendors';

const TABS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STOREFRONT_TONE: Record<string, string> = {
  active: 'bg-success/10 text-success',
  expired: 'bg-warning/15 text-warning',
  unpaid: 'bg-amber/15 text-amber',
  suspended: 'bg-danger/10 text-danger',
};

const STOREFRONT_LABEL: Record<string, string> = {
  active: 'Active',
  expired: 'Expired',
  unpaid: 'Unpaid',
  suspended: 'Suspended',
};

export default async function AdminSellersPage({ searchParams }: { searchParams: Promise<{ status?: string; saved?: string; error?: string }> }) {
  const { status = '', saved, error } = await searchParams;
  const filter = ['new', 'approved', 'rejected'].includes(status) ? status : '';

  const [applications, counts, accounts, settlements] = await Promise.all([
    prisma.sellerApplication.findMany({
      where: filter ? { status: filter } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.sellerApplication.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.seller.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        handle: true,
        email: true,
        phone: true,
        city: true,
        storefrontUntil: true,
        suspendedAt: true,
        feeRwf: true,
        feeDays: true,
        subaccountId: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.vendorSettlement.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        sellerName: true,
        amountCents: true,
        createdAt: true,
        order: { select: { number: true, paymentStatus: true, paymentMethod: true } },
      },
    }),
  ]);

  const countOf = (value: string) => counts.find((row) => row.status === value)?._count._all ?? 0;
  const pendingTotal = settlements.reduce((sum, row) => sum + row.amountCents, 0);

  return (
    <div>
      <PageHeader title="Vendors" description="Vendor accounts, storefront subscriptions and payouts. Applications come from the Become a Vendor page." />

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Vendor accounts ({accounts.length})</h2>
        {accounts.length ? (
          <ul className="space-y-3">
            {accounts.map((account) => {
              const state = storefrontStatus(account);
              return (
                <li key={account.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold">{account.name}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STOREFRONT_TONE[state] ?? 'bg-surface text-muted'}`}>
                          {STOREFRONT_LABEL[state] ?? state}
                        </span>
                        {!account.subaccountId ? (
                          <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">No payout subaccount</span>
                        ) : null}
                      </div>
                      <p className="mt-1 break-all text-sm text-muted">{account.email}</p>
                      <p className="text-sm text-muted">
                        {[account.phone, account.city].filter(Boolean).join(' · ') || 'No phone or city'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                        <span>{account._count.products} product(s)</span>
                        <span>RWF {account.feeRwf.toLocaleString('en-US')} / {account.feeDays} days</span>
                        <span>
                          {account.storefrontUntil ? `Paid until ${formatDate(account.storefrontUntil)}` : 'Never paid'}
                        </span>
                        <span>Joined {formatDate(account.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-brand">
                        {account.handle ? (
                          <Link href={`/store/${account.handle}`} className="hover:underline">
                            /store/{account.handle} →
                          </Link>
                        ) : (
                          'No store address set'
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Subaccount: {account.subaccountId ?? 'not set'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <form action={updateVendorStorefront}>
                          <input type="hidden" name="id" value={account.id} />
                          <input type="hidden" name="action" value="extend" />
                          <input type="hidden" name="days" value={account.feeDays} />
                          <button type="submit" className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">
                            +{account.feeDays} days
                          </button>
                        </form>
                        {account.suspendedAt ? (
                          <form action={updateVendorStorefront}>
                            <input type="hidden" name="id" value={account.id} />
                            <input type="hidden" name="action" value="resume" />
                            <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-brand hover:text-brand">
                              Restore
                            </button>
                          </form>
                        ) : (
                          <form action={updateVendorStorefront}>
                            <input type="hidden" name="id" value={account.id} />
                            <input type="hidden" name="action" value="suspend" />
                            <button type="submit" className="rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10">
                              Suspend
                            </button>
                          </form>
                        )}
                      </div>
                      <form action={updateVendorStorefront} className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface-alt p-2">
                        <input type="hidden" name="id" value={account.id} />
                        <input type="hidden" name="action" value="fee" />
                        <label className="text-[11px] font-semibold text-muted">
                          Fee RWF
                          <input
                            name="feeRwf"
                            type="number"
                            min={1000}
                            max={10000000}
                            step={500}
                            defaultValue={account.feeRwf}
                            className="mt-0.5 block h-8 w-24 rounded-lg border border-line bg-canvas px-2 text-xs text-ink"
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-muted">
                          Days
                          <input
                            name="feeDays"
                            type="number"
                            min={1}
                            max={365}
                            defaultValue={account.feeDays}
                            className="mt-0.5 block h-8 w-16 rounded-lg border border-line bg-canvas px-2 text-xs text-ink"
                          />
                        </label>
                        <button type="submit" className="h-8 rounded-full border border-line px-3 text-xs font-bold hover:border-brand hover:text-brand">
                          Save plan
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="card px-4 py-6 text-center text-sm text-muted">No vendor account yet. Run npm run db:seller to create one.</p>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Payouts waiting ({settlements.length})</h2>
            <p className="text-sm text-muted">Cash-on-delivery orders and vendors without a Flutterwave subaccount. Card and mobile money shares are split automatically.</p>
          </div>
          <p className="font-display text-lg font-bold text-brand">{formatMoney(pendingTotal, 'en')}</p>
        </div>
        {settlements.length ? (
          <div className="overflow-x-auto rounded-xl border border-line bg-canvas">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Vendor share</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {settlements.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-alt">
                    <td className="px-4 py-3 font-semibold">{row.order.number}</td>
                    <td className="px-4 py-3">{row.sellerName}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.order.paymentMethod} · {row.order.paymentStatus}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(row.amountCents, 'en')}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={markVendorSettlementPaid}>
                        <input type="hidden" name="id" value={row.id} />
                        <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:border-brand hover:text-brand">
                          Mark paid
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="card px-4 py-6 text-center text-sm text-muted">No payout waiting.</p>
        )}
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        <h2 className="w-full font-display text-lg font-semibold">Applications</h2>
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

      {applications.length ? (
        <ul className="space-y-3">
          {applications.map((application) => (
            <li key={application.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{application.storeName}</h2>
                    <StatusPill status={application.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {application.contactName} · {application.phone} · {application.city}
                  </p>
                  <p className="mt-1 text-sm">Sells: {application.categories}</p>
                  {application.message ? <p className="mt-2 rounded-lg bg-surface-alt p-2 text-sm">{application.message}</p> : null}
                  <p className="mt-2 text-xs text-muted">
                    Applied {formatDate(application.createdAt)} · {application.id}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {application.status !== 'approved' ? (
                    <form action={setSellerStatus}>
                      <input type="hidden" name="id" value={application.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button type="submit" className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">
                        Approve
                      </button>
                    </form>
                  ) : null}
                  {application.status !== 'rejected' ? (
                    <form action={setSellerStatus}>
                      <input type="hidden" name="id" value={application.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button type="submit" className="rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10">
                        Reject
                      </button>
                    </form>
                  ) : null}
                  {application.status !== 'new' ? (
                    <form action={setSellerStatus}>
                      <input type="hidden" name="id" value={application.id} />
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
