import { redirect } from 'next/navigation';
import { getSeller } from '@/lib/seller/auth';
import { SellerAuthShell } from '@/components/seller/auth-shell';
import { SellerRegisterForm } from '@/components/seller/auth-forms';

export const metadata = { title: 'Create a vendor account', robots: { index: false, follow: false } };

export default async function SellerRegisterPage() {
  if (await getSeller()) redirect('/seller');

  return (
    <SellerAuthShell title="Open your store" subtitle="Create an account, add products and activate your storefront.">
      <SellerRegisterForm />
    </SellerAuthShell>
  );
}
