'use client';

import { useState } from 'react';
import { t, type Locale } from '@/lib/i18n';

export function PayNow({ locale, number, phone }: { locale: Locale; number: string; phone: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function pay() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch('/api/orders/pay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ number, phone }),
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
      <button type="button" onClick={pay} disabled={busy} className="btn btn-primary disabled:opacity-60">
        {busy ? t(locale, 'order.paying') : t(locale, 'order.payNow')}
      </button>
      {failed ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger">
          {t(locale, 'order.payNowFailed')}
        </p>
      ) : null}
    </div>
  );
}
