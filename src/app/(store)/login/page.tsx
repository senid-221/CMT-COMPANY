import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale } from '@/lib/locale';
import { t, type Locale } from '@/lib/i18n';
import { getCustomer } from '@/lib/customer/auth';
import { googleConfigured } from '@/lib/google';
import { GoogleButton } from '@/components/auth/google-button';
import { LoginForm } from '@/components/auth/auth-forms';

export const metadata = { title: 'Sign in', robots: { index: false } };

function googleNotice(locale: Locale, error?: string) {
  if (error === 'google-cancelled') return t(locale, 'auth.googleCancelled');
  if (error === 'google-state') return t(locale, 'auth.googleState');
  if (error === 'google') return t(locale, 'auth.googleError');
  return '';
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCustomer()) redirect('/account');
  const locale = await getLocale();
  const { error } = await searchParams;
  const notice = googleNotice(locale, error);

  return (
    <div className="bg-page">
      <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
        <div className="rounded-2xl border border-line bg-canvas p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink">{t(locale, 'auth.signIn')}</h1>
          {notice ? (
            <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {notice}
            </p>
          ) : null}
          <div className="mt-6">
            <GoogleButton locale={locale} enabled={googleConfigured()} />
          </div>
          <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-line" />
            {t(locale, 'auth.or')}
            <span className="h-px flex-1 bg-line" />
          </div>
          <LoginForm locale={locale} />
          <p className="mt-5 text-center text-sm">
            <Link href="/shop" className="font-medium text-muted hover:text-brand">
              {t(locale, 'auth.guest')} →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
