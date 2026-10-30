import { redirect } from 'next/navigation';
import { getSeller } from '@/lib/seller/auth';
import { SellerAuthShell } from '@/components/seller/auth-shell';
import { SellerLoginForm } from '@/components/seller/auth-forms';

export const metadata = { title: 'Seller sign in', robots: { index: false, follow: false } };

export default async function SellerLoginPage() {
  if (await getSeller()) redirect('/seller');

  return (
    <SellerAuthShell title="Seller sign in" subtitle="Manage your listings and publish new products.">
      <SellerLoginForm />
    </SellerAuthShell>
  );
}
