import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale } from '@/lib/locale';
import { t, type Locale } from '@/lib/i18n';
import { getCustomer } from '@/lib/customer/auth';
import { googleConfigured } from '@/lib/google';
import { infoPage, infoTitle } from '@/lib/info';
import { GoogleButton } from '@/components/auth/google-button';
import { SignupForm } from '@/components/auth/auth-forms';

export const metadata = { title: 'Create account', robots: { index: false } };

function googleNotice(locale: Locale, error?: string) {
  if (error === 'google-cancelled') return t(locale, 'auth.googleCancelled');
  if (error === 'google-state') return t(locale, 'auth.googleState');
  if (error === 'google') return t(locale, 'auth.googleError');
  return '';
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCustomer()) redirect('/account');
  const locale = await getLocale();
  const { error } = await searchParams;
  const notice = googleNotice(locale, error);

  return (
    <div className="bg-page">
      <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
        <div className="rounded-2xl border border-line bg-canvas p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink">{t(locale, 'auth.signUp')}</h1>
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
          <SignupForm locale={locale} />
          <p className="mt-5 text-center text-xs leading-relaxed text-muted">
            {t(locale, 'auth.termsPrefix')}{' '}
            <Link href="/terms" className="font-semibold text-label underline underline-offset-2">
              {infoTitle(infoPage('terms')!, locale)}
            </Link>{' '}
            {t(locale, 'auth.termsJoin')}{' '}
            <Link href="/privacy" className="font-semibold text-label underline underline-offset-2">
              {infoTitle(infoPage('privacy')!, locale)}
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
