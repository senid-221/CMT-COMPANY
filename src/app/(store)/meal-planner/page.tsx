import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { t } from '@/lib/i18n';
import { plannerConfigured } from '@/lib/meal-planner';
import { OG_IMAGE } from '@/lib/seo';
import { MealPlanner } from '@/components/meal-planner';

const DESCRIPTION =
  'Tell Luna your meal style, dietary needs and budget, and get a meal plan built from the live CityMarket catalogue — priced and ready to add to your cart.';

export const metadata: Metadata = {
  title: 'Meal planner',
  description: DESCRIPTION,
  alternates: { canonical: '/meal-planner' },
  openGraph: {
    type: 'website',
    siteName: 'CityMarket',
    url: '/meal-planner',
    title: 'Meal planner',
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: 'Meal planner', description: DESCRIPTION, images: [OG_IMAGE.url] },
};

export default async function MealPlannerPage() {
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  const enabled = plannerConfigured();

  return (
    <div className="shell py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">{t(locale, 'planner.kicker')}</p>
          <h1 className="font-display text-3xl font-bold">{t(locale, 'planner.title')}</h1>
          <p className="max-w-2xl text-[15px] text-muted">{t(locale, 'planner.intro')}</p>
        </header>

        {enabled ? (
          <MealPlanner locale={locale} market={market} />
        ) : (
          <div className="card space-y-4 p-6">
            <p className="text-sm font-medium">{t(locale, 'planner.error.unconfigured')}</p>
            <Link href="/shop" className="btn btn-primary btn-3d">
              {t(locale, 'home.shopNow')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
