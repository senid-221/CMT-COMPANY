import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { INFO_PAGES } from '@/lib/info';
import { absoluteUrl } from '@/lib/seo';
import { activeVendorWhere } from '@/lib/vendors';

// Sellers publish between deploys, so regenerate hourly instead of freezing the list at build time.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/shop', priority: 0.9, changeFrequency: 'daily' },
  { path: '/meal-planner', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/sell', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    priority: page.priority,
    changeFrequency: page.changeFrequency,
  }));

  entries.push(
    ...INFO_PAGES.filter((page) => !STATIC_PAGES.some((stat) => stat.path === page.path)).map((page) => ({
      url: absoluteUrl(page.path),
      priority: 0.4,
      changeFrequency: 'yearly' as const,
    })),
  );

  try {
    const [categories, products, vendors] = await Promise.all([
      prisma.category.findMany({
        where: { products: { some: {} } },
        select: { handle: true },
        orderBy: { sort: 'asc' },
      }),
      prisma.product.findMany({
        where: activeVendorWhere(),
        select: { handle: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.seller.findMany({
        where: { handle: { not: null }, suspendedAt: null, storefrontUntil: { gt: new Date() } },
        select: { handle: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    entries.push(
      ...categories.map((category) => ({
        url: absoluteUrl(`/category/${category.handle}`),
        priority: 0.8,
        changeFrequency: 'weekly' as const,
      })),
      ...vendors.flatMap((vendor) =>
        vendor.handle
          ? [
              {
                url: absoluteUrl(`/store/${vendor.handle}`),
                priority: 0.7,
                changeFrequency: 'weekly' as const,
              },
            ]
          : [],
      ),
      ...products.map((product) => ({
        url: absoluteUrl(`/product/${product.handle}`),
        lastModified: product.createdAt,
        priority: 0.7,
        changeFrequency: 'weekly' as const,
      })),
    );
  } catch {
    // A cold database must not take the sitemap down; the static routes above still ship.
  }

  return entries;
}
