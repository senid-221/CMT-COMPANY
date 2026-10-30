import { prisma } from '@/lib/db';
import { t, type Locale } from '@/lib/i18n';

export type LocalizedText = { en: string; fr: string };

export type SiteContent = {
  announcement: { enabled: boolean; text: LocalizedText };
  hero: { title: LocalizedText; text: LocalizedText; ctaLabel: LocalizedText; ctaHref: string };
  delivery: { note: LocalizedText };
  featured: { handles: string[] };
};

const ROW_ID = 'site';

export const CONTENT_DEFAULTS: SiteContent = {
  announcement: { enabled: false, text: { en: '', fr: '' } },
  hero: {
    title: { en: t('en', 'home.heroTitle'), fr: t('fr', 'home.heroTitle') },
    text: { en: t('en', 'home.heroText'), fr: t('fr', 'home.heroText') },
    ctaLabel: { en: t('en', 'home.shopNow'), fr: t('fr', 'home.shopNow') },
    ctaHref: '/shop',
  },
  delivery: { note: { en: '', fr: '' } },
  featured: { handles: [] },
};

const LIMITS = { short: 160, medium: 400, title: 120, href: 200 };

function text(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return clean || fallback;
}

function optionalText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[ \t]+/g, ' ').trim().slice(0, max) : '';
}

function localized(value: unknown, fallback: LocalizedText, max: number): LocalizedText {
  const row = (value ?? {}) as Partial<LocalizedText>;
  return { en: text(row.en, fallback.en, max), fr: text(row.fr, fallback.fr, max) };
}

export function normalizeContent(input: unknown): SiteContent {
  const raw = (input ?? {}) as Partial<SiteContent>;
  const href = typeof raw.hero?.ctaHref === 'string' ? raw.hero.ctaHref.trim() : '';
  const handles = Array.isArray(raw.featured?.handles)
    ? raw.featured.handles.filter((h): h is string => typeof h === 'string' && /^[a-z0-9-]{2,80}$/i.test(h)).slice(0, 12)
    : [];

  return {
    announcement: {
      enabled: raw.announcement?.enabled === true,
      text: {
        en: optionalText(raw.announcement?.text?.en, LIMITS.short),
        fr: optionalText(raw.announcement?.text?.fr, LIMITS.short),
      },
    },
    hero: {
      title: localized(raw.hero?.title, CONTENT_DEFAULTS.hero.title, LIMITS.title),
      text: localized(raw.hero?.text, CONTENT_DEFAULTS.hero.text, LIMITS.medium),
      ctaLabel: localized(raw.hero?.ctaLabel, CONTENT_DEFAULTS.hero.ctaLabel, 40),
      ctaHref: href.startsWith('/') && !href.startsWith('//') ? href.slice(0, LIMITS.href) : CONTENT_DEFAULTS.hero.ctaHref,
    },
    delivery: { note: { en: optionalText(raw.delivery?.note?.en, LIMITS.short), fr: optionalText(raw.delivery?.note?.fr, LIMITS.short) } },
    featured: { handles },
  };
}

export async function getContent(): Promise<SiteContent> {
  try {
    const row = await prisma.siteContent.findUnique({ where: { id: ROW_ID }, select: { data: true } });
    if (!row) return CONTENT_DEFAULTS;
    return normalizeContent(JSON.parse(row.data));
  } catch {
    return CONTENT_DEFAULTS;
  }
}

export async function saveContent(content: SiteContent) {
  const data = JSON.stringify(normalizeContent(content));
  await prisma.siteContent.upsert({ where: { id: ROW_ID }, update: { data }, create: { id: ROW_ID, data } });
}

export function pickText(value: LocalizedText, locale: Locale) {
  return (locale === 'fr' ? value.fr : value.en).trim();
}
