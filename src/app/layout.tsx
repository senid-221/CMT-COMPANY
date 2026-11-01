import type { Metadata } from 'next';
import { Bai_Jamjuree, Plus_Jakarta_Sans } from 'next/font/google';
import { getLocale } from '@/lib/locale';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo';
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

const TITLE = 'CityMarket — Everyday Essentials Delivered';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: TITLE, template: '%s | CityMarket' },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: `${SITE_URL}/`,
    locale: 'en_US',
    alternateLocale: ['fr_FR'],
    title: TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: SITE_DESCRIPTION },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
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
