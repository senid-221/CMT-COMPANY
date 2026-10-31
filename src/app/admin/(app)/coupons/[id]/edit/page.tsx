import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { BackLink, Flash, PageHeader } from '@/components/admin/ui';
import { CouponForm } from '@/components/admin/coupon-form';

export default async function EditCouponPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) notFound();

  return (
    <div>
      <BackLink href="/admin/coupons">Coupons</BackLink>
      <PageHeader title={`Edit ${coupon.code}`} description={`Used ${coupon.usedCount} time(s) so far. Changes apply to new orders immediately.`} />
      <Flash saved={saved} error={error} />
      <CouponForm coupon={coupon} />
    </div>
  );
}
