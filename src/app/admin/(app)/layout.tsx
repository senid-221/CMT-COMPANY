import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/admin/sidebar';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | CityMarket admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [orders, sellers, reviews] = await Promise.all([
    prisma.order.count({ where: { status: { in: ['placed', 'packing'] } } }),
    prisma.sellerApplication.count({ where: { status: 'new' } }),
    prisma.review.count({ where: { status: 'pending' } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-alt md:flex-row">
      <AdminSidebar admin={admin} counts={{ orders, sellers, reviews }} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
