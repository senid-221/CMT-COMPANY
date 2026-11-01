import Link from 'next/link';
import type { Metadata } from 'next';
import { LogoMark } from '@/components/logo';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="shell py-20 text-center">
      <LogoMark size={56} labelled />
      <p className="mt-6 font-display text-5xl font-bold text-brand">404</p>
      <h1 className="mt-3 font-display text-xl font-semibold">This page is not on the shelf</h1>
      <p className="mt-2 text-muted">The product or page you were looking for does not exist.</p>
      <Link href="/shop" className="btn btn-primary mt-6">
        Back to shop
      </Link>
    </div>
  );
}
