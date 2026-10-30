'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/admin/actions';
import { Logo } from '@/components/logo';
import { BoxIcon, CalendarIcon, ChartIcon, GridIcon, LayoutIcon, StarIcon, UsersIcon } from '@/components/icons';

type Props = {
  admin: { name: string; email: string };
  counts: { orders: number; sellers: number; reviews: number };
};

export function AdminSidebar({ admin, counts }: Props) {
  const pathname = usePathname();
  const items = [
    { href: '/admin', label: 'Overview', icon: GridIcon, badge: 0 },
    { href: '/admin/orders', label: 'Orders', icon: CalendarIcon, badge: counts.orders },
    { href: '/admin/products', label: 'Products', icon: BoxIcon, badge: 0 },
    { href: '/admin/sellers', label: 'Sellers', icon: UsersIcon, badge: counts.sellers },
    { href: '/admin/reviews', label: 'Reviews', icon: StarIcon, badge: counts.reviews },
    { href: '/admin/content', label: 'Website content', icon: LayoutIcon, badge: 0 },
    { href: '/admin/visitors', label: 'Visitors', icon: ChartIcon, badge: 0 },
  ];

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-canvas md:flex">
        <div className="border-b border-line px-4 py-4">
          <Link href="/admin" aria-label="CityMarket admin">
            <Logo size="sm" />
          </Link>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Admin console</p>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Dashboard">
          {items.map(({ href, label, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive(href) ? 'bg-brand text-white' : 'text-ink hover:bg-hover hover:text-brand'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${isActive(href) ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand'}`}>
                  {badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line p-3">
          <div className="px-1">
            <p className="truncate text-sm font-semibold">{admin.name}</p>
            <p className="truncate text-xs text-muted">{admin.email}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost w-full py-2 text-sm">
              Sign out
            </button>
          </form>
          <Link href="/" className="block px-1 py-1 text-xs font-semibold text-brand hover:underline">
            View storefront →
          </Link>
        </div>
      </aside>

      <div className="border-b border-line bg-canvas md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" aria-label="CityMarket admin">
            <Logo size="sm" />
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-xs font-semibold text-brand">
              Sign out
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Dashboard">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                isActive(href) ? 'border-brand bg-brand text-white' : 'border-line text-ink'
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
