'use client';

import { useState } from 'react';
import { t, type Locale } from '@/lib/i18n';

export function ReviewForm({ handle, locale }: { handle: string; locale: Locale }) {
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'idle' | 'sent' | 'failed' | 'tooMany'>('idle');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          handle,
          author: String(data.get('author') ?? ''),
          rating,
          body: String(data.get('body') ?? ''),
        }),
      });
      if (response.status === 201) {
        setState('sent');
        form.reset();
        setRating(5);
      } else {
        setState(response.status === 429 ? 'tooMany' : 'failed');
      }
    } catch {
      setState('failed');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-xl bg-surface-alt p-4 text-sm font-semibold text-success" role="status">
        {t(locale, 'reviews.sent')}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="review-author">
            {t(locale, 'reviews.name')}
          </label>
          <input id="review-author" name="author" required minLength={2} maxLength={40} className="field" />
        </div>
        <div>
          <span className="label">{t(locale, 'reviews.rating')}</span>
          <div className="flex items-center gap-1" role="group" aria-label={t(locale, 'reviews.rating')}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={t(locale, 'reviews.star', { n: value })}
                aria-pressed={rating >= value}
                className={`text-2xl leading-none transition ${rating >= value ? 'text-amber' : 'text-muted'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="review-body">
          {t(locale, 'reviews.comment')}
        </label>
        <textarea id="review-body" name="body" required minLength={4} maxLength={800} rows={3} className="field" />
      </div>
      {state === 'failed' || state === 'tooMany' ? (
        <p className="text-sm font-semibold text-danger" role="alert">
          {state === 'tooMany' ? t(locale, 'reviews.tooMany') : t(locale, 'reviews.failed')}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="btn btn-primary">
        {t(locale, 'reviews.submit')}
      </button>
    </form>
  );
}
