import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale } from '@/lib/locale';
import { t, type Locale } from '@/lib/i18n';
import { formatMoney, formatUnits } from '@/lib/money';
import { findOrder } from '@/lib/orders';
import { bankDetails, getMarket, isCurrency } from '@/lib/market';
import { Logo } from '@/components/logo';
import { slotKey, statusKey, paymentMethodKey, paymentStatusKey } from '@/lib/order-labels';
import { isPaymentMethod, isOnlineMethod, paymentStatusValue, type PaymentStatus } from '@/lib/payment-methods';
import { methodAvailable } from '@/lib/payments';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/pricing';
import { PayNow } from '@/components/order-pay-now';

const PAY_PILL: Record<PaymentStatus, string> = {
  paid: 'bg-success/10 text-success',
  pending: 'bg-info/10 text-info',
  failed: 'bg-danger/10 text-danger',
  unpaid: 'bg-surface-alt text-muted',
};

function BankDetails({ locale }: { locale: Locale }) {
  const bank = bankDetails();
  if (!bank) return null;
  return (
    <dl className="mt-3 grid gap-1 rounded-xl bg-surface-alt p-4 text-sm sm:grid-cols-[auto_1fr]">
      <dt className="text-muted">{t(locale, 'order.bankName')}</dt>
      <dd className="font-medium">{bank.bank}</dd>
      <dt className="text-muted">{t(locale, 'order.bankAccount')}</dt>
      <dd className="font-mono font-medium">{bank.account}</dd>
      <dt className="text-muted">{t(locale, 'order.bankHolder')}</dt>
      <dd className="font-medium">{bank.holder}</dd>
    </dl>
  );
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ new?: string; paid?: string; pay?: string }>;
}) {
  const [{ number }, query] = await Promise.all([params, searchParams]);
  const locale = await getLocale();
  const market = await getMarket();
  const order = await findOrder(number);
  if (!order) notFound();

  const status = (ORDER_STATUSES as readonly string[]).includes(order.status)
    ? (order.status as OrderStatus)
    : 'placed';
  const isNew = query.new === '1';
  const stepIndex = ORDER_STATUSES.indexOf(status);

  const paymentMethod = isPaymentMethod(order.paymentMethod) ? order.paymentMethod : 'cod';
  const paymentStatus = paymentStatusValue(order.paymentStatus);
  const paid = paymentStatus === 'paid';
  const online = isOnlineMethod(paymentMethod);
  const showPaid = paid && query.paid === '1';
  const showPayFailed = !paid && (query.pay === 'failed' || query.paid === '0' || paymentStatus === 'failed');
  const chargedAmount =
    order.paymentAmount && isCurrency(order.paymentCurrency)
      ? formatUnits(order.paymentAmount, locale, order.paymentCurrency)
      : formatMoney(order.totalCents, locale, market);
  const canRetry = online && !paid && order.status !== 'cancelled' && methodAvailable(paymentMethod);

  return (
    <div className="shell max-w-3xl py-8">
      {showPaid ? (
        <div className="card mb-6 border-success/30 bg-success/5 p-6">
          <Logo size="sm" />
          <h1 className="mt-3 font-display text-2xl font-bold text-success">{t(locale, 'order.paidTitle')}</h1>
          <p className="mt-2 text-ink/80">{t(locale, 'order.paidBody', { amount: chargedAmount })}</p>
        </div>
      ) : null}

      {showPayFailed ? (
        <div className="card mb-6 border-danger/30 bg-danger/5 p-6">
          <h1 className="font-display text-xl font-bold text-danger">{t(locale, 'order.payFailed')}</h1>
        </div>
      ) : null}

      {isNew && !paid ? (
        <div className="card mb-6 border-brand/30 bg-brand/5 p-6">
          <Logo size="sm" />
          <h1 className="mt-3 font-display text-2xl font-bold text-brand">{t(locale, 'order.thanks')}</h1>
          <p className="mt-2 text-ink/80">
            {online
              ? t(locale, 'order.payPending')
              : paymentMethod === 'bank'
                ? t(locale, 'order.payBank', { amount: chargedAmount })
                : t(locale, 'order.payOnDelivery', { amount: chargedAmount })}
          </p>
        </div>
      ) : null}

      <div className="card space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{t(locale, 'order.number')}</p>
            <p className="font-display text-xl font-bold">{order.number}</p>
          </div>
          <span className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white">{t(locale, statusKey(status))}</span>
        </div>

        <ol className="flex items-center gap-1 text-xs">
          {ORDER_STATUSES.slice(0, 4).map((step, index) => (
            <li key={step} className="flex flex-1 flex-col gap-1">
              <span className={`h-1.5 rounded-full ${index <= stepIndex ? 'bg-brand' : 'bg-line'}`} />
              <span className={index <= stepIndex ? 'font-semibold text-brand' : 'text-muted'}>{t(locale, statusKey(step))}</span>
            </li>
          ))}
        </ol>

        <div className="border-t border-line pt-4">
          <h2 className="mb-2 font-display font-semibold">{t(locale, 'order.items')}</h2>
          <ul className="space-y-1.5 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="text-ink/80">
                  {item.quantity} × {item.productName} <span className="text-muted">({item.unit})</span>
                </span>
                <span className="font-medium">{formatMoney(item.lineTotalCents, locale, market)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink/70">{t(locale, 'cart.subtotal')}</span>
            <span>{formatMoney(order.subtotalCents, locale, market)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink/70">
              {t(locale, 'cart.delivery')} · {t(locale, slotKey(order.slot))}
            </span>
            <span>{formatMoney(order.deliveryFeeCents, locale, market)}</span>
          </div>
          <div className="flex justify-between pt-1 font-display text-base font-bold">
            <span>{t(locale, 'cart.total')}</span>
            <span className="text-brand">{formatMoney(order.totalCents, locale, market)}</span>
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold">{t(locale, 'order.payment')}</h2>
              <p className="text-sm text-ink/80">{t(locale, paymentMethodKey(paymentMethod))}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PAY_PILL[paymentStatus]}`}>
              {t(locale, paymentStatusKey(paymentStatus))}
            </span>
          </div>
          {online && order.paymentAmount ? <p className="mt-1 text-xs text-muted">{t(locale, 'checkout.charged', { amount: chargedAmount })}</p> : null}
          {paymentMethod === 'bank' && !paid ? <BankDetails locale={locale} /> : null}
          {paid && order.paymentRef ? (
            <p className="mt-1 text-xs text-muted">
              {t(locale, 'order.reference')}: <span className="font-mono">{order.paymentRef}</span>
            </p>
          ) : null}
          {canRetry ? (
            <div className="mt-3">
              <PayNow locale={locale} number={order.number} phone={order.phone} />
            </div>
          ) : null}
          {online && !paid && !methodAvailable(paymentMethod) ? <p className="mt-2 text-xs text-muted">{t(locale, 'checkout.onlineUnavailable')}</p> : null}
        </div>

        <div className="rounded-xl bg-surface p-4 text-sm">
          <p className="font-semibold">{order.customerName}</p>
          <p className="text-ink/70">
            {order.addressLine}, {order.city}
          </p>
          <p className="text-ink/70">{order.phone}</p>
          {order.deliveryNote ? <p className="mt-1 italic text-muted">“{order.deliveryNote}”</p> : null}
          <p className="mt-2 text-xs text-muted">
            {t(locale, 'order.orderedOn')} {new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(order.placedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className="btn btn-primary">
            {t(locale, 'cart.continue')}
          </Link>
          <Link href={`/track?phone=${encodeURIComponent(order.phone)}`} className="btn btn-ghost">
            {t(locale, 'order.viewOrders')}
          </Link>
        </div>
      </div>
    </div>
  );
}
