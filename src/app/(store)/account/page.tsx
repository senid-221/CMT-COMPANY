import Link from 'next/link';
import { getLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { statusKey } from '@/lib/order-labels';
import { findOrdersForCustomer } from '@/lib/orders';
import { requireCustomer } from '@/lib/customer/auth';
import { logoutCustomer } from '@/app/(store)/auth-actions';

export const metadata = { title: 'My account', robots: { index: false } };

const PILL: Record<string, string> = {
  placed: 'bg-amber-100 text-amber-800',
  packing: 'bg-sky-100 text-sky-800',
  onWay: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

export default async function AccountPage() {
  const customer = await requireCustomer();
  const locale = await getLocale();
  const orders = await findOrdersForCustomer(customer);
  const date = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium' });
  const initial = customer.name.trim().charAt(0).toUpperCase();

  return (
    <div className="shell max-w-4xl py-8">
      <h1 className="font-display text-2xl font-bold">{t(locale, 'account.title')}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="card h-fit space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand/10 font-display text-xl font-bold text-brand">{initial}</span>
            <div className="min-w-0">
              <p className="truncate font-display font-semibold">{customer.name}</p>
              <p className="text-xs text-muted">{t(locale, 'account.member', { date: date.format(customer.createdAt) })}</p>
            </div>
          </div>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t(locale, 'auth.email')}</dt>
              <dd className="break-all">{customer.email}</dd>
            </div>
            {customer.phone ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t(locale, 'auth.phone')}</dt>
                <dd>{customer.phone}</dd>
              </div>
            ) : null}
          </dl>
          <form action={logoutCustomer}>
            <button type="submit" className="btn btn-ghost w-full">
              {t(locale, 'account.signOut')}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{t(locale, 'account.purchases')}</h2>
          {orders.length ? (
            orders.map((order) => (
              <Link
                key={order.number}
                href={`/order/${order.number}`}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-brand"
              >
                <div className="min-w-0">
                  <p className="font-display font-bold">{order.number}</p>
                  <p className="text-sm text-muted">
                    {date.format(order.placedAt)} · {t(locale, 'cart.items', { n: order.items.length })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PILL[order.status] ?? 'bg-surface-alt text-ink'}`}>
                    {t(locale, statusKey(order.status))}
                  </span>
                  <span className="font-display font-bold text-brand">{formatMoney(order.totalCents, locale)}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="card p-8 text-center">
              <p className="text-muted">{t(locale, 'account.empty')}</p>
              <Link href="/shop" className="btn btn-primary mt-4">
                {t(locale, 'orders.start')}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
