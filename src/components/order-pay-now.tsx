'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t, type Locale } from '@/lib/i18n';
import { paymentMethodKey } from '@/lib/order-labels';
import type { PaymentMethod } from '@/lib/payment-methods';

export function PayNow({
  locale,
  number,
  phone,
  rails,
}: {
  locale: Locale;
  number: string;
  phone: string;
  /** Online rails this order may still switch to; empty when it already has one. */
  rails: PaymentMethod[];
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function pay(method?: PaymentMethod) {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch('/api/orders/pay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ number, phone, ...(method ? { method } : {}) }),
      });
      const data = await response.json();
      if (!response.ok || typeof data?.url !== 'string' || !/^https?:\/\//i.test(data.url)) {
        setFailed(true);
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div>
      {rails.length ? (
        <>
          <p className="text-xs text-muted">{t(locale, 'order.paySwitch')}</p>
          <p className="mt-3 mb-2 text-sm font-semibold">{t(locale, 'order.payWith')}</p>
          <div className="flex flex-wrap gap-2">
            {rails.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => void pay(method)}
                disabled={busy}
                className="btn btn-primary btn-3d disabled:opacity-60"
              >
                {busy ? t(locale, 'order.paying') : `${t(locale, 'order.payNow')} · ${t(locale, paymentMethodKey(method))}`}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button type="button" onClick={() => void pay()} disabled={busy} className="btn btn-primary disabled:opacity-60">
          {busy ? t(locale, 'order.paying') : t(locale, 'order.payNow')}
        </button>
      )}
      {failed ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger">
          {t(locale, 'order.payNowFailed')}
        </p>
      ) : null}
    </div>
  );
}

/** Polls while a payment is still in flight so the page settles into “paid” without a manual reload. */
export function PaymentWatch({ locale, number, phone }: { locale: Locale; number: string; phone: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let stopped = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (stopped) return;
      if (tries++ >= 45) {
        setChecking(false);
        return;
      }
      try {
        const response = await fetch(`/api/orders/status?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(phone)}`, {
          cache: 'no-store',
        });
        if (response.status === 404 || response.status === 429) {
          setChecking(false);
          return;
        }
        const data = (await response.json()) as { paymentStatus?: string };
        if (data?.paymentStatus === 'paid') {
          setChecking(false);
          router.refresh();
          return;
        }
      } catch {
        // A dropped poll is retried on the next tick; the gateway webhook is the source of truth.
      }
      timer = setTimeout(tick, 4000);
    };

    timer = setTimeout(tick, 4000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [number, phone, router]);

  if (!checking) return null;
  return (
    <p className="mt-2 flex items-center gap-2 text-xs text-muted">
      <span className="h-2 w-2 animate-pulse rounded-full bg-info" aria-hidden />
      {t(locale, 'order.checking')}
    </p>
  );
}
