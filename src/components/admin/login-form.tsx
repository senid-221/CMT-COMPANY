'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/app/admin/actions';

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="admin-email">
          Email
        </label>
        <input id="admin-email" name="email" type="email" required autoComplete="username" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="admin-password">
          Password
        </label>
        <input id="admin-password" name="password" type="password" required autoComplete="current-password" className="field" />
      </div>
      {state.error ? (
        <p className="text-sm font-semibold text-danger" role="alert">
          {state.error === 'too-many' ? 'Too many attempts. Try again in 15 minutes.' : 'Wrong email or password.'}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
