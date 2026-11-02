'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { t, type Locale, type MessageKey } from '@/lib/i18n';
import { slotKey } from '@/lib/order-labels';
import { formatMoney } from '@/lib/money';
import { offeredRails, type Currency, type Market } from '@/lib/markets';
import { DELIVERY_SLOTS, type Slot } from '@/lib/pricing';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/payment-methods';
import { localizedName } from '@/lib/catalog';
import { clearCart } from '@/lib/cart';
import { recordOrder } from '@/lib/local-orders';
import { usePricedCart } from '@/components/cart-view';
import { GoogleButton } from '@/components/auth/google-button';

export type CheckoutPayments = {
  card: boolean;
  rails: Record<'card' | 'mtn' | 'orange' | 'wave', boolean>;
  rates: { RWF: number; XOF: number };
};

/** The rail this shopper last paid with, remembered per market. */
const METHOD_MEMORY = 'cmb_pay_method';

function rememberedMethod(code: string): PaymentMethod | null {
  try {
    const value = localStorage.getItem(`${METHOD_MEMORY}:${code}`);
    return value && (PAYMENT_METHODS as readonly string[]).includes(value) ? (value as PaymentMethod) : null;
  } catch {
    return null;
  }
}

export function CheckoutView({
  locale,
  customer,
  googleEnabled,
  payments,
  market,
}: {
  locale: Locale;
  customer: { name: string; email: string; phone: string } | null;
  googleEnabled: boolean;
  payments: CheckoutPayments;
  market: Market;
}) {
  const router = useRouter();
  const { priced, subtotalCents, itemCount, feeFor } = usePricedCart(locale);
  const [slot, setSlot] = useState<Slot>('today');
  const [method, setMethod] = useState<PaymentMethod>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountCents, setDiscountCents] = useState(0);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    const remembered = rememberedMethod(market.code);
    if (remembered && offeredRails(market.methods, payments.rails).includes(remembered)) setMethod(remembered);
  }, [market, payments.rails]);

  function chooseMethod(chosen: PaymentMethod) {
    setMethod(chosen);
    try {
      localStorage.setItem(`${METHOD_MEMORY}:${market.code}`, chosen);
    } catch {
      // Private mode only: the pick still holds for this checkout.
    }
  }

  const deliveryFee = feeFor(slot);
  const total = Math.max(0, subtotalCents - discountCents) + deliveryFee;

  const cartLines = priced.map((l) => ({ handle: l.handle, quantity: l.qty }));

  async function checkCode(code: string) {
    const response = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, lines: cartLines }),
    });
    if (!response.ok) return null;
    return (await response.json()) as { ok?: boolean; error?: string; discountCents?: number; shortfallCents?: number };
  }

  function couponMessage(result: { error?: string; shortfallCents?: number }) {
    const key = COUPON_ERRORS[result.error ?? 'invalid'] ?? 'coupon.error.invalid';
    if (result.error === 'minSubtotal') {
      return t(locale, key, { amount: formatMoney(result.shortfallCents ?? 0, locale, market) });
    }
    return t(locale, key);
  }

  /** The cart can change after a code is applied, so re-price it whenever the subtotal moves. */
  useEffect(() => {
    if (!appliedCode) {
      setDiscountCents(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await checkCode(appliedCode);
      if (cancelled) return;
      if (result?.ok) {
        setDiscountCents(Math.max(0, Math.round(Number(result.discountCents ?? 0))));
        return;
      }
      setAppliedCode(null);
      setDiscountCents(0);
      setCouponError(result ? couponMessage(result) : t(locale, 'coupon.error.invalid'));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalCents, appliedCode]);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponError(null);
    const result = await checkCode(code).catch(() => null);
    setCouponBusy(false);
    if (result?.ok) {
      setAppliedCode(code);
      setDiscountCents(Math.max(0, Math.round(Number(result.discountCents ?? 0))));
      setCouponInput(code);
      return;
    }
    setAppliedCode(null);
    setDiscountCents(0);
    setCouponError(result ? couponMessage(result) : t(locale, 'coupon.error.invalid'));
  }

  function removeCoupon() {
    setAppliedCode(null);
    setDiscountCents(0);
    setCouponError(null);
    setCouponInput('');
  }

  /** Each rail is billed in the currency its network actually settles in. */
  function currencyFor(chosen: PaymentMethod): Currency {
    if (chosen === 'card') return 'USD';
    if (chosen === 'mtn') return 'RWF';
    if (chosen === 'orange' || chosen === 'wave') return 'XOF';
    return market.currency;
  }

  function pricesFor(chosen: PaymentMethod) {
    const currency = currencyFor(chosen);
    return { currency, ratePerUsd: currency === 'USD' ? 1 : payments.rates[currency === 'RWF' ? 'RWF' : 'XOF'] };
  }

  const offered = offeredRails(market.methods, payments.rails);

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
      lines: cartLines,
      customerName: String(form.get('customerName') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? '') || null,
      addressLine: String(form.get('addressLine') ?? ''),
      city: String(form.get('city') ?? ''),
      deliveryNote: String(form.get('deliveryNote') ?? '') || null,
      slot,
      paymentMethod: method,
      coupon: appliedCode,
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
        if (code.startsWith('coupon:')) {
          setAppliedCode(null);
          setDiscountCents(0);
          setCouponError(couponMessage({ error: code.slice('coupon:'.length) }));
          setSubmitting(false);
          return;
        }
        setError(
          code === 'stale-cart'
            ? t(locale, 'checkout.stale')
            : code === 'payment-unavailable'
              ? t(locale, 'checkout.onlineUnavailable')
              : code.includes('phoneLocal')
                ? t(locale, 'checkout.phoneLocal', { code: market.phoneCode ?? '' })
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
    method === 'cod' || method === 'bank'
      ? `${t(locale, 'checkout.place')} · ${formatMoney(total, locale, market)}`
      : `${t(locale, 'checkout.pay')} · ${formatMoney(total, locale, pricesFor(method))}`;

  return (
    <div className="shell grid gap-5 py-6 sm:gap-6 sm:py-8 lg:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="card space-y-5 p-4 sm:p-6">
        <h1 className="font-display text-xl font-bold sm:text-2xl">{t(locale, 'checkout.title')}</h1>

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
            <Field name="phone" label={t(locale, 'checkout.phone')} required type="tel" autoComplete="tel" placeholder={market.phoneCode ? `${market.phoneCode} XX XXX XXX` : undefined} defaultValue={customer?.phone} />
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
            <label key={value} className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-3 ${slot === value ? 'border-brand bg-brand/5' : 'border-line'}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="slot" value={value} checked={slot === value} onChange={() => setSlot(value)} className="accent-[#297357]" />
                <span className="font-medium">{t(locale, slotKey(value))}</span>
              </span>
              <span className="text-sm text-muted">{formatMoney(feeFor(value), locale, market)}</span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <h2 className="font-display font-semibold text-brand">{t(locale, 'coupon.codeLabel')}</h2>
          <div className="flex flex-wrap items-stretch gap-2">
            <input
              value={couponInput}
              onChange={(event) => {
                setCouponInput(event.target.value.toUpperCase().slice(0, 32));
                if (appliedCode) {
                  setAppliedCode(null);
                  setDiscountCents(0);
                }
                setCouponError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void applyCoupon();
                }
              }}
              aria-label={t(locale, 'coupon.codeLabel')}
              placeholder={t(locale, 'coupon.placeholder')}
              maxLength={32}
              className="field min-w-0 flex-1 basis-36 font-display font-semibold uppercase tracking-wide"
            />
            {appliedCode ? (
              <button type="button" className="btn btn-ghost btn-3d btn-3d-line shrink-0" onClick={removeCoupon}>
                {t(locale, 'coupon.remove')}
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-3d shrink-0" disabled={couponBusy || !couponInput.trim()} onClick={() => void applyCoupon()}>
                {couponBusy ? '…' : t(locale, 'coupon.apply')}
              </button>
            )}
          </div>
          {appliedCode ? (
            <p key={appliedCode} className="anim-rise text-sm font-semibold text-brand flip-in">
              ✓ {t(locale, 'coupon.applied', { code: appliedCode })} · −{formatMoney(discountCents, locale, market)}
            </p>
          ) : null}
          {couponError ? <p className="text-sm font-semibold text-danger">{couponError}</p> : null}
        </div>

        <div className="space-y-2">
          <h2 className="font-display font-semibold text-brand">{t(locale, 'checkout.payment')}</h2>
          {offered.map((chosen) => (
            <PaymentOption
              key={chosen}
              method={chosen}
              selected={method === chosen}
              onSelect={() => chooseMethod(chosen)}
              label={t(locale, PAYMENT_LABEL[chosen])}
              hint={PAYMENT_HINTS[chosen] ? t(locale, PAYMENT_HINTS[chosen]) : undefined}
            />
          ))}
          {offered.length === 1 ? <p className="pt-1 text-xs text-muted">{t(locale, 'checkout.onlineUnavailable')}</p> : null}
          {method === 'cod' || method === 'bank' || !payments.rails[method as 'card' | 'mtn' | 'orange' | 'wave'] ? null : (
            <p className="pt-1 text-xs font-medium text-brand">
              {t(locale, 'checkout.charged', { amount: formatMoney(total, locale, pricesFor(method)) })} ·{' '}
              {t(locale, 'checkout.rate', {
                rate: new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US').format(pricesFor(method).ratePerUsd),
                currency: currencyFor(method),
              })}
            </p>
          )}
          <PaymentSteps locale={locale} method={method} />
        </div>

        {error ? <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}

        <button type="submit" className="btn btn-primary btn-3d w-full" disabled={submitting}>
          {submitting ? '…' : actionLabel}
        </button>
      </form>

      <aside className="card h-fit space-y-3 p-4 sm:p-5 lg:sticky lg:top-28">
        <h2 className="font-display text-lg font-semibold">{t(locale, 'checkout.summary')}</h2>
        <ul className="space-y-2 text-sm">
          {priced.map((l) => (
            <li key={l.handle} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-ink/80">
                {l.qty} × {localizedName(l, locale)}
              </span>
              <span className="shrink-0 font-medium">{formatMoney(l.priceCents * l.qty, locale, market)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <span>
              {t(locale, 'cart.subtotal')} ({t(locale, 'cart.items', { n: itemCount })})
            </span>
            <span>{formatMoney(subtotalCents, locale, market)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t(locale, 'cart.delivery')}</span>
            <span>{formatMoney(deliveryFee, locale, market)}</span>
          </div>
          {appliedCode && discountCents > 0 ? (
            <div className="flex justify-between font-semibold text-brand">
              <span>
                {t(locale, 'coupon.saved')} · {appliedCode}
              </span>
              <span>−{formatMoney(discountCents, locale, market)}</span>
            </div>
          ) : null}
          <div className="flex justify-between pt-1 font-display text-base font-bold">
            <span>{t(locale, 'cart.total')}</span>
            <span className="text-brand">{formatMoney(total, locale, market)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

const COUPON_ERRORS: Record<string, MessageKey> = {
  invalid: 'coupon.error.invalid',
  expired: 'coupon.error.expired',
  notStarted: 'coupon.error.notStarted',
  minSubtotal: 'coupon.error.minSubtotal',
  used: 'coupon.error.used',
  market: 'coupon.error.market',
};

const PAYMENT_HINTS: Partial<Record<PaymentMethod, MessageKey>> = {  card: 'checkout.cardHint',
  mtn: 'checkout.momoHint',
  orange: 'checkout.momoHint',
  wave: 'checkout.momoHint',
  bank: 'checkout.bankHint',
};

const PAYMENT_LABEL: Record<PaymentMethod, MessageKey> = {
  cod: 'pay.method.cod',
  card: 'pay.method.card',
  mtn: 'pay.method.mtn',
  orange: 'pay.method.orange',
  wave: 'pay.method.wave',
  bank: 'pay.method.bank',
};

const PAYMENT_STEPS: Record<PaymentMethod, MessageKey[]> = {
  cod: ['pay.steps.cod'],
  card: ['pay.steps.card.1', 'pay.steps.card.2', 'pay.steps.card.3'],
  mtn: ['pay.steps.mtn.1', 'pay.steps.mtn.2', 'pay.steps.mtn.3'],
  orange: ['pay.steps.orange.1', 'pay.steps.orange.2', 'pay.steps.orange.3'],
  wave: ['pay.steps.wave.1', 'pay.steps.wave.2', 'pay.steps.wave.3'],
  bank: ['pay.steps.bank.1', 'pay.steps.bank.2', 'pay.steps.bank.3'],
};

function PaymentSteps({ locale, method }: { locale: Locale; method: PaymentMethod }) {
  const steps = PAYMENT_STEPS[method];
  return (
    <div className="rounded-xl border border-line bg-surface-alt p-4">
      <p className="text-sm font-semibold">
        {t(locale, 'pay.steps.title')} · {t(locale, PAYMENT_LABEL[method])}
      </p>
      {steps.length === 1 ? (
        <p className="mt-1.5 text-sm text-muted">{t(locale, steps[0])}</p>
      ) : (
        <ol className="mt-2 space-y-2 text-sm text-muted">
          {steps.map((key, index) => (
            <li key={key} className="flex gap-2.5">
              <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                {index + 1}
              </span>
              <span>{t(locale, key)}</span>
            </li>
          ))}
        </ol>
      )}
      {method === 'cod' || method === 'bank' ? null : (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-brand/5 px-3 py-2 text-xs font-medium text-brand">
          <svg viewBox="0 0 24 24" className="mt-px h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
          </svg>
          {t(locale, 'pay.steps.security')}
        </p>
      )}
    </div>
  );
}

function PaymentOption({
  method,
  label,
  hint,
  selected,
  onSelect,
}: {
  method: PaymentMethod;
  label: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 ${
        selected ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/40'
      }`}
    >
      <input
        type="radio"
        name="paymentMethod"
        value={method}
        checked={selected}
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

const LOGO_CHIP = 'flex h-9 shrink-0 items-center justify-center rounded-md border border-line bg-white px-1.5';

const BRAND_MARKS: Record<'mtn' | 'orange' | 'wave', { src: string; className: string }> = {
  mtn: { src: '/media/payments/mtn.svg', className: 'h-5 w-auto' },
  orange: { src: '/media/payments/orange-money.svg', className: 'h-3 w-auto' },
  wave: { src: '/media/payments/wave.png', className: 'h-4 w-auto' },
};

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
      <span className={`${LOGO_CHIP} w-20 gap-1.5 px-2`}>
        <img src="/media/payments/visa.svg" alt="" width={1000} height={325} className="h-3 w-auto" />
        <img src="/media/payments/mastercard.svg" alt="" width={1000} height={618} className="h-4 w-auto" />
      </span>
    );
  }
  if (method === 'bank') {
    return (
      <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M3 9.5 12 4l9 5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8" strokeLinecap="round" />
          <path d="M3 20.5h18" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  const mark = BRAND_MARKS[method];
  return (
    <span className={`${LOGO_CHIP} w-14`}>
      <img src={mark.src} alt="" className={mark.className} />
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
