import type { Metadata } from 'next';
import { Bai_Jamjuree, Plus_Jakarta_Sans } from 'next/font/google';
import { getLocale } from '@/lib/locale';
import { THEME_BOOTSTRAP } from '@/lib/theme';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jamjuree = Bai_Jamjuree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jamjuree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'CityMarket — everyday essentials delivered', template: '%s | CityMarket' },
  description:
    'CityMarket is an online marketplace: groceries, beauty, drinks, fashion and electronics from trusted sellers, delivered with cash on delivery.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  twitter: { card: 'summary_large_image', title: 'CityMarket — everyday essentials delivered', description: 'An online marketplace with cash on delivery.' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${jakarta.variable} ${jamjuree.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-page font-body text-ink antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
      </body>
    </html>
  );
}
