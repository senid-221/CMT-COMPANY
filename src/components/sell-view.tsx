'use client';

import Link from 'next/link';
import { useState } from 'react';
import { t, type Locale } from '@/lib/i18n';

export function SellView({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      storeName: String(form.get('storeName') ?? ''),
      contactName: String(form.get('contactName') ?? ''),
      phone: String(form.get('phone') ?? ''),
      city: String(form.get('city') ?? ''),
      categories: String(form.get('categories') ?? ''),
      message: String(form.get('message') ?? ''),
    };

    setError(null);
    setStatus('sending');
    try {
      const response = await fetch('/api/sell', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const code = String(data?.error ?? 'failed');
        setError(
          code === 'invalid-phone'
            ? t(locale, 'sell.badPhone')
            : code === 'too-many-requests'
              ? t(locale, 'sell.tooMany')
              : code.startsWith('invalid')
                ? t(locale, 'checkout.required')
                : t(locale, 'sell.failed'),
        );
        setStatus('idle');
        return;
      }
      setStatus('sent');
    } catch {
      setError(t(locale, 'sell.failed'));
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div className="card p-8 text-center">
        <h2 className="font-display text-xl font-bold text-brand">{t(locale, 'sell.sent')}</h2>
        <p className="mt-2 text-ink/75">{t(locale, 'sell.sentText')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">
            {t(locale, 'orders.start')}
          </Link>
          <button type="button" onClick={() => setStatus('idle')} className="btn btn-ghost">
            {t(locale, 'sell.again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t(locale, 'sell.storeName')}</span>
          <input name="storeName" required minLength={2} maxLength={80} autoComplete="organization" className="field" />
        </label>
        <label className="block">
          <span className="label">{t(locale, 'sell.contactName')}</span>
          <input name="contactName" required minLength={2} maxLength={60} autoComplete="name" className="field" />
        </label>
        <label className="block">
          <span className="label">{t(locale, 'checkout.phone')}</span>
          <input name="phone" type="tel" required autoComplete="tel" placeholder="+250 7X XXX XXXX" className="field" />
        </label>
        <label className="block">
          <span className="label">{t(locale, 'checkout.city')}</span>
          <input name="city" required minLength={2} maxLength={40} autoComplete="address-level2" className="field" />
        </label>
      </div>

      <label className="block">
        <span className="label">{t(locale, 'sell.categories')}</span>
        <input name="categories" required minLength={2} maxLength={120} className="field" />
      </label>

      <label className="block">
        <span className="label">{t(locale, 'sell.message')}</span>
        <textarea name="message" rows={4} maxLength={600} className="field resize-y" />
      </label>

      {error ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={status === 'sending'} className="btn btn-primary w-full">
        {t(locale, 'sell.submit')}
      </button>
    </form>
  );
}
