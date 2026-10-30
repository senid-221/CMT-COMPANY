'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { t, type Locale, type MessageKey } from '@/lib/i18n';
import { slotKey } from '@/lib/order-labels';
import { formatMoney, formatXof } from '@/lib/money';
import { DELIVERY_SLOTS, type Slot } from '@/lib/pricing';
import type { PaymentMethod } from '@/lib/payment-methods';
import { localizedName } from '@/lib/catalog';
import { clearCart } from '@/lib/cart';
import { recordOrder } from '@/lib/local-orders';
import { usePricedCart } from '@/components/cart-view';
import { GoogleButton } from '@/components/auth/google-button';

export function CheckoutView({
  locale,
  customer,
  googleEnabled,
  payments,
}: {
  locale: Locale;
  customer: { name: string; email: string; phone: string } | null;
  googleEnabled: boolean;
  payments: { card: boolean; mobile: boolean; xofRate: number };
}) {
  const router = useRouter();
  const { priced, subtotalCents, itemCount, feeFor } = usePricedCart(locale);
  const [slot, setSlot] = useState<Slot>('today');
  const [method, setMethod] = useState<PaymentMethod>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliveryFee = feeFor(slot);
  const total = subtotalCents + deliveryFee;
  const chargedXof = Math.max(1, Math.round((total / 100) * payments.xofRate));

  if (!priced.length) {
    return (
      <div className="shell py-16 text-center">
        <h1 className="font-display text-2xl font-bold">{t(locale, 'checkout.title')}</h1>
        <p className="mt-2 text-muted">{t(locale, 'checkout.empty')}</p>
        <Link href="/shop" className="btn btn-primary mt-6">
          {t(locale, 'cart.continue')}
        </Link>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setSubmitting(true);

    const body = {
      lines: priced.map((l) => ({ handle: l.handle, quantity: l.qty })),
      customerName: String(form.get('customerName') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? '') || null,
      addressLine: String(form.get('addressLine') ?? ''),
      city: String(form.get('city') ?? ''),
      deliveryNote: String(form.get('deliveryNote') ?? '') || null,
      slot,
      paymentMethod: method,
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        const code = String(data?.error ?? 'failed');
        setError(
          code === 'stale-cart'
            ? t(locale, 'checkout.stale')
            : code === 'payment-unavailable'
              ? t(locale, 'checkout.onlineUnavailable')
              : code.startsWith('invalid')
                ? t(locale, 'checkout.required')
                : t(locale, 'checkout.failed'),
        );
        setSubmitting(false);
        return;
      }
      recordOrder({ number: String(data.number), phone: body.phone, placedAt: new Date().toISOString() });
      clearCart();
      if (typeof data.paymentUrl === 'string' && data.paymentUrl && /^https?:\/\//i.test(data.paymentUrl)) {
        window.location.assign(data.paymentUrl);
        return;
      }
      router.push(`/order/${data.number}${data.paymentError ? '?pay=failed' : '?new=1'}`);
    } catch {
      setError(t(locale, 'checkout.failed'));
      setSubmitting(false);
    }
  }

  const actionLabel =
    method === 'cod'
      ? `${t(locale, 'checkout.place')} · ${formatMoney(total, locale)}`
      : `${t(locale, 'checkout.pay')} · ${method === 'card' ? formatMoney(total, locale) : formatXof(chargedXof, locale)}`;

  return (
    <div className="shell grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="card space-y-5 p-6">
        <h1 className="font-display text-2xl font-bold">{t(locale, 'checkout.title')}</h1>

        <div className="space-y-3">
          <h2 className="font-display font-semibold text-brand">{t(locale, 'checkout.contact')}</h2>
          {!customer && googleEnabled ? (
            <div>
              <GoogleButton locale={locale} enabled next="/checkout" />
              <p className="mt-1.5 text-xs text-muted">{t(locale, 'checkout.googleHint')}</p>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="customerName" label={t(locale, 'checkout.name')} required autoComplete="name" defaultValue={customer?.name} />
            <Field name="phone" label={t(locale, 'checkout.phone')} required type="tel" autoComplete="tel" placeholder="+250 7X XXX XXXX" defaultValue={customer?.phone} />
          </div>
          <Field name="email" label={t(locale, 'checkout.email')} type="email" autoComplete="email" defaultValue={customer?.email} />
        </div>

        <div className="space-y-3">
          <h2 className="font-display font-semibold text-brand">{t(locale, 'checkout.address')}</h2>
          <Field name="addressLine" label={t(locale, 'checkout.address')} required autoComplete="street-address" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="city" label={t(locale, 'checkout.city')} required autoComplete="address-level2" />
            <div>
              <label className="label" htmlFor="deliveryNote">
                {t(locale, 'checkout.note')}
              </label>
              <textarea id="deliveryNote" name="deliveryNote" rows={2} className="field" maxLength={200} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-display font-semibold text-brand">{t(locale, 'checkout.slot')}</h2>
          {DELIVERY_SLOTS.map((value) => (
            <label key={value} className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 ${slot === value ? 'border-brand bg-brand/5' : 'border-line'}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="slot" value={value} checked={slot === value} onChange={() => setSlot(value)} className="accent-[#297357]" />
                <span className="font-medium">{t(locale, slotKey(value))}</span>
              </span>
              <span className="text-sm text-muted">{formatMoney(feeFor(value), locale)}</span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <h2 className="font-display font-semibold text-brand">{t(locale, 'checkout.payment')}</h2>
          <PaymentOption method="cod" selected={method === 'cod'} onSelect={() => setMethod('cod')} label={t(locale, 'pay.method.cod')} />
          <PaymentOption
            method="card"
            selected={method === 'card'}
            enabled={payments.card}
            onSelect={() => setMethod('card')}
            label={t(locale, 'pay.method.card')}
            hint={t(locale, 'checkout.cardHint')}
          />
          {MOMO_LABELS.map(({ method: network, key }) => (
            <PaymentOption
              key={network}
              method={network}
              selected={method === network}
              enabled={payments.mobile}
              onSelect={() => setMethod(network)}
              label={t(locale, key)}
              hint={t(locale, 'checkout.momoHint')}
            />
          ))}
          {payments.card ? null : <p className="pt-1 text-xs text-muted">{t(locale, 'checkout.onlineUnavailable')}</p>}
          {method !== 'cod' && method !== 'card' && payments.mobile ? (
            <p className="pt-1 text-xs font-medium text-brand">
              {t(locale, 'checkout.charged', { amount: formatXof(chargedXof, locale) })} ·{' '}
              {t(locale, 'checkout.rate', { rate: new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US').format(payments.xofRate) })}
            </p>
          ) : null}
        </div>

        {error ? <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? '…' : actionLabel}
        </button>
      </form>

      <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold">{t(locale, 'checkout.summary')}</h2>
        <ul className="space-y-2 text-sm">
          {priced.map((l) => (
            <li key={l.handle} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-ink/80">
                {l.qty} × {localizedName(l, locale)}
              </span>
              <span className="shrink-0 font-medium">{formatMoney(l.priceCents * l.qty, locale)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <span>
              {t(locale, 'cart.subtotal')} ({t(locale, 'cart.items', { n: itemCount })})
            </span>
            <span>{formatMoney(subtotalCents, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t(locale, 'cart.delivery')}</span>
            <span>{formatMoney(deliveryFee, locale)}</span>
          </div>
          <div className="flex justify-between pt-1 font-display text-base font-bold">
            <span>{t(locale, 'cart.total')}</span>
            <span className="text-brand">{formatMoney(total, locale)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

const MOMO_LABELS: { method: 'mtn' | 'orange' | 'wave'; key: MessageKey }[] = [
  { method: 'mtn', key: 'pay.method.mtn' },
  { method: 'orange', key: 'pay.method.orange' },
  { method: 'wave', key: 'pay.method.wave' },
];

function PaymentOption({
  method,
  label,
  hint,
  selected,
  enabled = true,
  onSelect,
}: {
  method: PaymentMethod;
  label: string;
  hint?: string;
  selected: boolean;
  enabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
        !enabled ? 'cursor-not-allowed border-line opacity-55' : selected ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/40'
      }`}
    >
      <input
        type="radio"
        name="paymentMethod"
        value={method}
        checked={selected}
        disabled={!enabled}
        onChange={onSelect}
        className="accent-[#297357]"
      />
      <PaymentMark method={method} />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function PaymentMark({ method }: { method: PaymentMethod }) {
  if (method === 'cod') {
    return (
      <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 9.5v.01M18 14.5v.01" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (method === 'card') {
    return (
      <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="2.5" y="5" width="19" height="14" rx="2" />
          <path d="M2.5 9.5h19" />
          <path d="M6 15h4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  const styles: Record<'mtn' | 'orange' | 'wave', string> = {
    mtn: 'bg-[#ffcc00] text-[#003b5c]',
    orange: 'bg-[#ff7900] text-white',
    wave: 'bg-[#1dc8ff] text-[#041e42]',
  };
  return (
    <span className={`flex h-9 w-12 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold lowercase tracking-tight ${styles[method]}`}>
      {method}
    </span>
  );
}

function Field({
  name,
  label,
  required,
  type = 'text',
  autoComplete,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        maxLength={200}
        className="field"
      />
    </div>
  );
}
