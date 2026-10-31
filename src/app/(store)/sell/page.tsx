import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { SellView } from '@/components/sell-view';
import { StoreIcon } from '@/components/icons';
import { OG_IMAGE } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Become a Seller',
  description: 'Sell groceries, fashion, drinks, electronics and more on CityMarket. Apply online, get help with photos and pricing, and get paid every week.',
  alternates: { canonical: '/sell' },
  openGraph: {
    type: 'website',
    siteName: 'CityMarket',
    url: '/sell',
    title: 'Become a Seller',
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: 'Become a Seller', images: [OG_IMAGE.url] },
};

export default async function SellPage() {
  const locale = await getLocale();
  const benefits = [t(locale, 'sell.b1'), t(locale, 'sell.b2'), t(locale, 'sell.b3')];

  return (
    <div className="shell grid max-w-5xl gap-6 py-8 lg:grid-cols-[1fr_420px]">
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
          <StoreIcon size={24} />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{t(locale, 'sell.title')}</h1>
        <p className="mt-2 text-ink/75">{t(locale, 'sell.intro')}</p>
        <ul className="mt-6 space-y-3">
          {benefits.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm font-medium">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl border border-line bg-canvas p-4">
          <p className="text-sm text-ink/75">{t(locale, 'sell.portalHint')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/seller/register" className="btn btn-primary text-sm">
              {t(locale, 'sell.openAccount')}
            </Link>
            <Link href="/seller/login" className="btn btn-ghost text-sm">
              {t(locale, 'sell.portalSignIn')}
            </Link>
          </div>
        </div>
      </div>

      <SellView locale={locale} />
    </div>
  );
}
