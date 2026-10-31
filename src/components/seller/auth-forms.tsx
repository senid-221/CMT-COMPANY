'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { SellerAuthState } from '@/app/seller/actions';
import { loginSeller, registerSeller } from '@/app/seller/actions';

const INPUT =
  'h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const LABEL = 'mb-1 block text-sm font-semibold text-label';

const LOGIN_ERRORS: Record<string, string> = {
  invalid: 'Wrong email or password.',
  'too-many': 'Too many attempts. Try again in 15 minutes.',
  failed: 'Something went wrong. Try again.',
};

const REGISTER_ERRORS: Record<string, string> = {
  invalid: 'Enter a store name with at least 2 characters.',
  'bad-email': 'Enter a valid email address.',
  'short-password': 'Use at least 8 characters for the password.',
  exists: 'A seller account with this email already exists. Sign in instead.',
  'too-many': 'Too many attempts. Try again in 15 minutes.',
  failed: 'Something went wrong. Try again.',
};

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
      {message}
    </p>
  );
}

export function SellerLoginForm() {
  const [state, action, pending] = useActionState(loginSeller, { error: null } as SellerAuthState);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={LABEL} htmlFor="seller-email">
          Seller email
        </label>
        <input id="seller-email" name="email" type="email" required autoComplete="email" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="seller-password">
          Password
        </label>
        <input id="seller-password" name="password" type="password" required autoComplete="current-password" className={INPUT} />
      </div>
      <ErrorNote message={state.error ? LOGIN_ERRORS[state.error] ?? LOGIN_ERRORS.failed : ''} />
      <button type="submit" disabled={pending} className="btn btn-primary h-11 w-full disabled:opacity-60">
        {pending ? 'Signing in…' : 'Sign in to seller portal'}
      </button>
      <p className="pt-1 text-center text-sm text-muted">
        New seller?{' '}
        <Link href="/seller/register" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SellerRegisterForm() {
  const [state, action, pending] = useActionState(registerSeller, { error: null } as SellerAuthState);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={LABEL} htmlFor="seller-store">
          Store name
        </label>
        <input id="seller-store" name="name" required minLength={2} maxLength={80} autoComplete="organization" placeholder="HighQuality Ltd" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="seller-email">
          Email
        </label>
        <input id="seller-email" name="email" type="email" required autoComplete="email" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="seller-phone">
          Phone (optional)
        </label>
        <input id="seller-phone" name="phone" type="tel" autoComplete="tel" placeholder="+250 7X XXX XXXX" className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="seller-password">
          Password
        </label>
        <input id="seller-password" name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
        <p className="mt-1 text-xs text-muted">At least 8 characters. You can publish products right away.</p>
      </div>
      <ErrorNote message={state.error ? REGISTER_ERRORS[state.error] ?? REGISTER_ERRORS.failed : ''} />
      <button type="submit" disabled={pending} className="btn btn-primary h-11 w-full disabled:opacity-60">
        {pending ? 'Creating account…' : 'Create seller account'}
      </button>
      <p className="pt-1 text-center text-sm text-muted">
        Already selling here?{' '}
        <Link href="/seller/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
