import Link from 'next/link';
import { requireSeller } from '@/lib/seller/auth';
import { logoutSeller } from '@/app/seller/actions';
import { Logo } from '@/components/logo';

export const metadata = { title: { default: 'Seller portal', template: '%s | CityMarket seller' }, robots: { index: false, follow: false } };

export default async function SellerPortalLayout({ children }: { children: React.ReactNode }) {
  const seller = await requireSeller();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link href="/seller" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">Seller</span>
          <nav className="flex items-center gap-4 text-sm font-semibold text-slate-600">
            <Link href="/seller" className="hover:text-brand">
              Products
            </Link>
            <Link href="/shop" className="hover:text-brand">
              View shop
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm font-semibold text-slate-700 sm:block">{seller.name}</span>
            <form action={logoutSeller}>
              <button type="submit" className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand">
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
