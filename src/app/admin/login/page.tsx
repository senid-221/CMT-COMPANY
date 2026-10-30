import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/admin/auth';
import { LoginForm } from '@/components/admin/login-form';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect('/admin');

  return (
    <main className="grid min-h-screen place-items-center bg-surface-alt px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="card space-y-5 p-6 shadow-lg">
          <div className="space-y-1 text-center">
            <h1 className="font-display text-xl font-bold">Admin dashboard</h1>
            <p className="text-sm text-muted">Sign in to manage the store.</p>
          </div>
          <LoginForm />
        </div>
        <p className="text-center text-xs text-muted">CityMarket operations console</p>
      </div>
    </main>
  );
}
