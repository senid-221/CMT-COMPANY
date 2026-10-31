import Link from 'next/link';
import { Logo } from '@/components/logo';

export function SellerAuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <Link href="/sell" className="text-sm font-semibold text-muted hover:text-brand">
            Why sell on CityMarket?
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
        <div className="rounded-2xl border border-line bg-canvas p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Seller portal</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          <Link href="/" className="font-medium hover:text-brand">
            ← Back to CityMarket
          </Link>
        </p>
      </main>
    </div>
  );
}
