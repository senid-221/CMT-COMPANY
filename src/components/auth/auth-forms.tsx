'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { t, type Locale } from '@/lib/i18n';
import type { AuthState } from '@/app/(store)/auth-actions';
import { loginCustomer, signupCustomer } from '@/app/(store)/auth-actions';

const INPUT =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const LABEL = 'mb-1 block text-sm font-semibold text-slate-700';

function errorText(locale: Locale, error: AuthState['error']) {
  switch (error) {
    case 'invalid':
      return t(locale, 'auth.invalid');
    case 'exists':
      return t(locale, 'auth.exists');
    case 'google-account':
      return t(locale, 'auth.googleAccount');
    case 'bad-email':
      return t(locale, 'auth.badEmail');
    case 'short-password':
      return t(locale, 'auth.shortPassword');
    case 'too-many':
      return t(locale, 'auth.tooMany');
    case 'failed':
      return t(locale, 'auth.failed');
    default:
      return '';
  }
}

function ErrorNote({ locale, error }: { locale: Locale; error: AuthState['error'] }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      {errorText(locale, error)}
    </p>
  );
}

export function LoginForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(loginCustomer, { error: null } as AuthState);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={LABEL} htmlFor="login-email">
          {t(locale, 'auth.email')}
        </label>
        <input id="login-email" name="email" type="email" required autoComplete="email" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="login-password">
          {t(locale, 'auth.password')}
        </label>
        <input id="login-password" name="password" type="password" required autoComplete="current-password" className={INPUT} />
      </div>
      <ErrorNote locale={locale} error={state.error} />
      <button type="submit" disabled={pending} className="btn btn-primary h-11 w-full disabled:opacity-60">
        {t(locale, 'auth.signIn')}
      </button>
      <p className="pt-1 text-center text-sm text-slate-600">
        {t(locale, 'auth.noAccount')}{' '}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          {t(locale, 'auth.signUp')}
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(signupCustomer, { error: null } as AuthState);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={LABEL} htmlFor="signup-name">
          {t(locale, 'auth.name')}
        </label>
        <input id="signup-name" name="name" required autoComplete="name" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="signup-email">
          {t(locale, 'auth.email')}
        </label>
        <input id="signup-email" name="email" type="email" required autoComplete="email" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="signup-phone">
          {t(locale, 'auth.phone')}
        </label>
        <input id="signup-phone" name="phone" type="tel" autoComplete="tel" placeholder="+250 7X XXX XXXX" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="signup-password">
          {t(locale, 'auth.password')}
        </label>
        <input id="signup-password" name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
        <p className="mt-1 text-xs text-slate-500">{t(locale, 'auth.passwordHint')}</p>
      </div>
      <ErrorNote locale={locale} error={state.error} />
      <button type="submit" disabled={pending} className="btn btn-primary h-11 w-full disabled:opacity-60">
        {t(locale, 'auth.create')}
      </button>
      <p className="pt-1 text-center text-sm text-slate-600">
        {t(locale, 'auth.haveAccount')}{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t(locale, 'auth.signIn')}
        </Link>
      </p>
    </form>
  );
}
