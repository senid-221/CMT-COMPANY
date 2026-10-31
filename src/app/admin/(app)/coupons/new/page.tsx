import { BackLink, Flash, PageHeader } from '@/components/admin/ui';
import { CouponForm } from '@/components/admin/coupon-form';

export default async function NewCouponPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div>
      <BackLink href="/admin/coupons">Coupons</BackLink>
      <PageHeader title="New coupon" description="A code shoppers can apply at checkout, plus the ad shown on the home page." />
      <Flash error={error} />
      <CouponForm />
    </div>
  );
}
