import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireSeller } from '@/lib/seller/auth';
import { startStorefrontBilling } from '@/app/seller/actions';
import { storefrontChargeOptions } from '@/lib/vendor-billing';
import { formatMoney } from '@/lib/money';
import { storefrontActive, storefrontStatus } from '@/lib/vendors';
import type { OnlinePaymentMethod } from '@/lib/payment-methods';

export const metadata = { title: 'Storefront billing', robots: { index: false, follow: false } };

const METHOD_LABEL: Record<OnlinePaymentMethod, string> = {
  card: 'Card',
  mtn: 'MTN Mobile Money',
  orange: 'Orange Money',
  wave: 'Wave',
};

const ERRORS: Record<string, string> = {
  method: 'Choose a payment method.',
  unavailable: 'Online billing is not configured. Contact CityMarket support to activate your store.',
  gateway: 'The payment page could not open. Try again.',
};

function chargeLabel(currency: string, amount: number) {
  if (currency === 'USD') return formatMoney(amount, 'en');
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(value);
}

export default async function VendorBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; failed?: string; error?: string }>;
}) {
  const seller = await requireSeller();
  const { paid, failed, error } = await searchParams;
  const active = storefrontActive(seller);
  const status = storefrontStatus(seller);
  const options = storefrontChargeOptions(seller.feeRwf);
  const invoices = await prisma.storefrontInvoice.findMany({
    where: { sellerId: seller.id },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, reference: true, feeRwf: true, days: true, currency: true, amount: true, status: true, paidAt: true, periodEnd: true, createdAt: true },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-ink">Storefront billing</h1>
      <p className="mt-1 text-sm text-muted">
        RWF {seller.feeRwf.toLocaleString('en-US')} every {seller.feeDays} days keeps your store public on CityMarket.
      </p>

      {paid ? <p role="status" className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">Payment received. Your storefront is now active.</p> : null}
      {failed ? <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">The payment did not complete. Nothing was charged for an unfinished checkout.</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{ERRORS[error] ?? 'Something went wrong.'}</p> : null}

      <section className={`mt-5 rounded-2xl border p-5 ${active ? 'border-success/30 bg-success/5' : 'border-warning/40 bg-warning/5'}`}>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Current status</p>
        <h2 className="mt-1 font-display text-xl font-bold text-ink">
          {active ? 'Active' : status === 'suspended' ? 'Suspended' : status === 'expired' ? 'Expired' : 'Not activated'}
        </h2>
        <p className="mt-1 text-sm text-ink/75">
          {active && seller.storefrontUntil
            ? `Paid until ${formatDate(seller.storefrontUntil)}. Paying again adds ${seller.feeDays} days on top.`
            : status === 'suspended'
              ? 'An administrator suspended this storefront. Contact support before paying again.'
              : `Pay to make your store public under /store/${seller.handle ?? 'your-store'}.`}
        </p>
        {!seller.subaccountId ? (
          <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-sm font-semibold text-warning">
            Add your Flutterwave subaccount ID in <Link href="/seller/settings" className="underline">Storefront settings</Link> so
            online payments reach you directly.
          </p>
        ) : null}
      </section>

      <section className="card mt-5 p-5">
        <h2 className="font-display text-lg font-semibold text-ink">{active ? 'Renew' : 'Activate'} your storefront</h2>
        {options.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((option) => (
              <form key={option.method} action={startStorefrontBilling}>
                <input type="hidden" name="method" value={option.method} />
                <button type="submit" className="btn btn-primary text-sm">
                  Pay {chargeLabel(option.charge.currency, option.charge.amount)} · {METHOD_LABEL[option.method]}
                </button>
              </form>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Online billing is unavailable because the payment gateway or exchange rate is not configured. Contact support
            and an administrator can activate the storefront for you.
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          Payments open the secure Flutterwave page. CityMarket never asks for card numbers, PINs or CVVs here.
        </p>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Payment history</h2>
        {invoices.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Charged</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Covered until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-2 pr-3 text-muted">{formatDate(invoice.createdAt)}</td>
                    <td className="py-2 pr-3">RWF {invoice.feeRwf.toLocaleString('en-US')} · {invoice.days} days</td>
                    <td className="py-2 pr-3">{chargeLabel(invoice.currency, invoice.amount)}</td>
                    <td className={`py-2 pr-3 font-semibold ${invoice.status === 'paid' ? 'text-success' : invoice.status === 'failed' ? 'text-danger' : 'text-warning'}`}>
                      {invoice.status}
                    </td>
                    <td className="py-2 text-muted">{invoice.periodEnd ? formatDate(invoice.periodEnd) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No payment yet.</p>
        )}
      </section>
    </div>
  );
}
