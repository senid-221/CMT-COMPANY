import Link from 'next/link';
import { getLocale } from '@/lib/locale';
import { t, type Locale } from '@/lib/i18n';
import { getCategories, localizedName } from '@/lib/catalog';
import { getContent, pickText } from '@/lib/content';
import { CartBadge, SavedBadge } from '@/components/cart-badge';
import { CategoryStrip } from '@/components/category-strip';
import { LocaleSwitch } from '@/components/locale-switch';
import { Logo } from '@/components/logo';
import { MenuButton, ThemeToggle, type MenuItem } from '@/components/nav-controls';
import { BellIcon, BookmarkIcon, CalendarIcon, CartIcon, SearchIcon, UserIcon } from '@/components/icons';
import { VisitorTracker } from '@/components/visitor-tracker';
import { WhatsAppFab } from '@/components/whatsapp-fab';
import { INFO_PAGES } from '@/lib/info';

const ICON_LINK = 'relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-hover hover:text-brand';

function menuItems(locale: Locale): MenuItem[] {
  return [
    { href: '/shop', label: t(locale, 'nav.shop') },
    { href: '/track', label: t(locale, 'nav.track') },
    { href: '/orders', label: t(locale, 'nav.orders') },
    { href: '/saved', label: t(locale, 'nav.saved') },
    { href: '/account', label: t(locale, 'nav.account') },
    { href: '/sell', label: t(locale, 'nav.sell') },
  ];
}

function infoLabel(locale: Locale, slug: string) {
  const page = INFO_PAGES.find((item) => item.slug === slug);
  return page ? page.title[locale] : slug;
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const [categories, content] = await Promise.all([getCategories(), getContent()]);
  const announcement = pickText(content.announcement.text, locale);
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP ?? '').replace(/\D/g, '');

  return (
    <div className="flex min-h-screen flex-col">
      <VisitorTracker />
      {content.announcement.enabled && announcement ? (
        <div className="bg-brand px-4 py-2 text-center text-sm font-semibold text-white">{announcement}</div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="shell flex flex-wrap items-center gap-3 py-3">
          <Link href="/" className="shrink-0" aria-label="CityMarket">
            <Logo />
          </Link>

          <form
            action="/shop"
            method="get"
            className="order-last flex w-full items-center md:order-none md:mx-4 md:w-auto md:flex-1"
          >
            <div className="relative flex h-11 w-full max-w-xl items-center rounded-full border border-line bg-canvas transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <button type="submit" aria-label={t(locale, 'search.button')} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/55 hover:text-brand">
                <SearchIcon size={18} />
              </button>
              <input
                type="search"
                name="q"
                placeholder={t(locale, 'search.placeholder')}
                aria-label={t(locale, 'search.placeholder')}
                className="h-11 w-full min-w-0 bg-transparent pr-4 text-[15px] text-ink outline-none"
              />
            </div>
          </form>

          <nav className="ml-auto flex items-center gap-0 sm:gap-1">
            <MenuButton locale={locale} items={menuItems(locale)} />
            <LocaleSwitch locale={locale} />
            <Link href="/notifications" aria-label={t(locale, 'nav.notifications')} className={ICON_LINK}>
              <BellIcon size={20} />
            </Link>
            <Link href="/orders" aria-label={t(locale, 'nav.orders')} className={ICON_LINK}>
              <CalendarIcon size={20} />
            </Link>
            <Link href="/cart" aria-label={t(locale, 'nav.cart')} className={ICON_LINK}>
              <CartIcon size={20} />
              <CartBadge />
            </Link>
            <Link href="/saved" aria-label={t(locale, 'nav.saved')} className={`${ICON_LINK} hidden sm:grid`}>
              <BookmarkIcon size={20} />
              <SavedBadge />
            </Link>
            <Link href="/account" aria-label={t(locale, 'nav.account')} className={`${ICON_LINK} hidden sm:grid`}>
              <UserIcon size={20} />
            </Link>
            <ThemeToggle locale={locale} />
          </nav>
        </div>

        <div className="border-t border-line bg-surface-alt">
          <div className="shell">
            <CategoryStrip items={categories.map((c) => ({ handle: c.handle, label: localizedName(c, locale) }))} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-12 border-t border-line bg-surface">
        <div className="shell grid gap-8 py-9 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Logo size="sm" />
            <p className="text-sm text-muted">{t(locale, 'footer.tagline')}</p>
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
              >
                {t(locale, 'footer.whatsapp')}
              </a>
            ) : null}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">{t(locale, 'nav.shop')}</h2>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/shop" className="hover:text-brand">
                  {t(locale, 'home.allProducts')}
                </Link>
              </li>
              <li>
                <Link href="/shop?deals=1" className="hover:text-brand">
                  {t(locale, 'home.deals')}
                </Link>
              </li>
              {categories.slice(0, 4).map((category) => (
                <li key={category.handle}>
                  <Link href={`/category/${category.handle}`} className="hover:text-brand">
                    {localizedName(category, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">{t(locale, 'footer.company')}</h2>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/about" className="hover:text-brand">
                  {infoLabel(locale, 'about')}
                </Link>
              </li>
              <li>
                <Link href="/sell" className="hover:text-brand">
                  {t(locale, 'nav.sell')}
                </Link>
              </li>
              <li>
                <Link href="/seller" className="hover:text-brand">
                  {t(locale, 'footer.sellerPortal')}
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-brand">
                  {infoLabel(locale, 'support')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">{t(locale, 'footer.help')}</h2>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/faq" className="hover:text-brand">
                  {infoLabel(locale, 'faq')}
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-brand">
                  {infoLabel(locale, 'shipping')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand">
                  {infoLabel(locale, 'terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand">
                  {infoLabel(locale, 'privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-line">
          <div className="shell py-4 text-sm text-muted">
            © {new Date().getFullYear()} CityMarket. {t(locale, 'footer.rights')}
          </div>
        </div>
      </footer>

      <WhatsAppFab phone={whatsapp} locale={locale} />
    </div>
  );
}
