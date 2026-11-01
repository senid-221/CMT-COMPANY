import Link from 'next/link';
import { requireSeller } from '@/lib/seller/auth';
import { storefrontActive } from '@/lib/vendors';
import { logoutSeller } from '@/app/seller/actions';
import { Logo } from '@/components/logo';

export const metadata = { title: { default: 'Vendor portal', template: '%s | CityMarket vendor' }, robots: { index: false, follow: false } };

export default async function SellerPortalLayout({ children }: { children: React.ReactNode }) {
  const seller = await requireSeller();
  const active = storefrontActive(seller);

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link href="/seller" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">Vendor</span>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-muted">
            <Link href="/seller" className="hover:text-brand">
              Products
            </Link>
            <Link href="/seller/orders" className="hover:text-brand">
              Orders
            </Link>
            <Link href="/seller/billing" className="hover:text-brand">
              Billing
            </Link>
            <Link href="/seller/settings" className="hover:text-brand">
              Storefront
            </Link>
            {active && seller.handle ? (
              <Link href={`/store/${seller.handle}`} className="hover:text-brand">
                View store
              </Link>
            ) : null}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm font-semibold text-label sm:block">{seller.name}</span>
            <form action={logoutSeller}>
              <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted hover:border-brand hover:text-brand">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
