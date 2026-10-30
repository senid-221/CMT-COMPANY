import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { infoPage, infoTitle } from '@/lib/info';
import { notFound } from 'next/navigation';

function SupportLinks({ locale }: { locale: Locale }) {
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP ?? '').replace(/\D/g, '');
  const email = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '').trim();

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          {t(locale, 'footer.whatsapp')}
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className="btn btn-ghost">
          {email}
        </a>
      ) : null}
      <Link href="/sell" className="btn btn-ghost">
        {t(locale, 'nav.sell')}
      </Link>
    </div>
  );
}

export function InfoArticle({ slug, locale }: { slug: string; locale: Locale }) {
  const page = infoPage(slug);
  if (!page) notFound();

  return (
    <article className="shell max-w-3xl py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">CityMarket</p>
      <h1 className="mt-1 font-display text-3xl font-bold">{infoTitle(page, locale)}</h1>
      <p className="mt-3 leading-relaxed text-ink/75">{page.intro[locale]}</p>

      <div className="mt-8 space-y-7">
        {page.sections.map((section) => (
          <section key={section.heading.en}>
            <h2 className="font-display text-lg font-semibold">{section.heading[locale]}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.en} className="mt-2 leading-relaxed text-ink/80">
                {paragraph[locale]}
              </p>
            ))}
          </section>
        ))}
      </div>

      {slug === 'support' ? <SupportLinks locale={locale} /> : null}

      <Link href="/shop" className="mt-10 inline-block text-sm font-semibold text-brand hover:underline">
        {t(locale, 'cart.continue')} →
      </Link>
    </article>
  );
}
