import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { prisma } from './db';
import type { Locale } from './i18n';

export type ProductRow = {
  handle: string;
  name: string;
  nameFr: string | null;
  unit: string;
  priceCents: number;
  compareAtCents: number | null;
  image: string;
  stock: number;
  featured: boolean;
  category: { handle: string; name: string; nameFr: string | null };
  rating?: number;
  ratingCount?: number;
};

export type CategoryRow = { handle: string; name: string; nameFr: string | null; image: string };

export function localizedName(row: { name: string; nameFr: string | null }, locale: Locale) {
  return locale === 'fr' && row.nameFr ? row.nameFr : row.name;
}

const CATALOG_TTL = 300;
const CATALOG_TAG = 'catalog';

const productSelect = {
  id: true,
  handle: true,
  name: true,
  nameFr: true,
  unit: true,
  priceCents: true,
  compareAtCents: true,
  image: true,
  stock: true,
  featured: true,
  category: { select: { handle: true, name: true, nameFr: true } },
} as const;

export const getCategories = cache(
  unstable_cache(
    async (): Promise<CategoryRow[]> =>
      prisma.category.findMany({
        where: { products: { some: {} } },
        select: { handle: true, name: true, nameFr: true, image: true },
        orderBy: { sort: 'asc' },
      }),
    ['catalog:categories'],
    { revalidate: CATALOG_TTL, tags: [CATALOG_TAG] },
  ),
);

export const getCategory = cache(
  unstable_cache(
    async (handle: string) =>
      prisma.category.findUnique({ where: { handle }, select: { handle: true, name: true, nameFr: true, image: true } }),
    ['catalog:category'],
    { revalidate: CATALOG_TTL, tags: [CATALOG_TAG] },
  ),
);

export type SortKey = 'name' | 'price-asc' | 'price-desc' | 'newest' | 'rating';

const ORDER_BY: Record<SortKey, Prisma.ProductOrderByWithRelationInput> = {
  name: { name: 'asc' },
  'price-asc': { priceCents: 'asc' },
  'price-desc': { priceCents: 'desc' },
  newest: { createdAt: 'desc' },
  rating: { name: 'asc' },
};

async function attachRatings(rows: ProductRow[]): Promise<ProductRow[]> {
  if (!rows.length) return rows;
  const ids = (rows as (ProductRow & { id: string })[]).map((row) => row.id);
  const stats = await prisma.review.groupBy({
    by: ['productId'],
    where: { status: 'approved', productId: { in: ids } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const byId = new Map(stats.map((s) => [s.productId, s]));
  return rows.map((row) => {
    const stat = byId.get((row as ProductRow & { id: string }).id);
    const count = stat?._count._all ?? 0;
    return { ...row, rating: count ? Math.round((stat?._avg.rating ?? 0) * 10) / 10 : undefined, ratingCount: count };
  });
}

export type ProductQuery = { q?: string; category?: string; sort?: SortKey; take?: number; deals?: boolean; minRating?: number };

async function runProductQuery(q: string, category: string, sort: SortKey, take: number, deals: boolean, minRating: number) {
  // Rating filters and rating sorts are applied after the review rollup, so those
  // queries must read the whole match set; everything else can lean on LIMIT.
  const postFiltered = minRating > 0 || sort === 'rating';
  const rows = (await prisma.product.findMany({
    where: {
      ...(category ? { category: { handle: category } } : {}),
      ...(q ? { searchName: { contains: q } } : {}),
      ...(deals ? { compareAtCents: { not: null } } : {}),
    },
    orderBy: ORDER_BY[sort],
    ...(take > 0 && !postFiltered ? { take } : {}),
    select: productSelect,
  })) as ProductRow[];

  let result = await attachRatings(rows);
  if (minRating) result = result.filter((row) => (row.rating ?? 0) >= minRating);
  if (sort === 'rating') {
    result = result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0) || a.name.localeCompare(b.name));
  }
  return take ? result.slice(0, take) : result;
}

const productsCached = unstable_cache(runProductQuery, ['catalog:products'], {
  revalidate: CATALOG_TTL,
  tags: [CATALOG_TAG],
});

export const getProducts = cache(async (opts: ProductQuery = {}) =>
  productsCached(
    (opts.q ?? '').toLowerCase().trim(),
    opts.category ?? '',
    opts.sort ?? 'name',
    opts.take ?? 0,
    opts.deals === true,
    opts.minRating ?? 0,
  ),
);

export async function getDeals(take = 8): Promise<ProductRow[]> {
  return getProducts({ deals: true, take, sort: 'price-asc' });
}

export const getFeatured = cache(
  unstable_cache(
    async (): Promise<ProductRow[]> => {
      const rows = (await prisma.product.findMany({
        where: { featured: true },
        orderBy: { name: 'asc' },
        take: 10,
        select: productSelect,
      })) as ProductRow[];
      return attachRatings(rows);
    },
    ['catalog:featured'],
    { revalidate: CATALOG_TTL, tags: [CATALOG_TAG] },
  ),
);

const fetchHandles = unstable_cache(
  async (list: string[]): Promise<ProductRow[]> => {
    const found = (await prisma.product.findMany({
      where: { handle: { in: list } },
      select: productSelect,
    })) as ProductRow[];
    const order = new Map(list.map((handle, index) => [handle, index]));
    found.sort((a, b) => (order.get(a.handle) ?? 99) - (order.get(b.handle) ?? 99));
    return attachRatings(found);
  },
  ['catalog:by-handles'],
  { revalidate: CATALOG_TTL, tags: [CATALOG_TAG] },
);

export const getProductsByHandles = cache(async (handles: string[]): Promise<ProductRow[]> => {
  if (!handles.length) return [];
  return fetchHandles(handles.slice(0, 12));
});

const fetchProduct = unstable_cache(
  async (slug: string): Promise<(ProductRow & { description: string | null; descriptionFr: string | null }) | null> => {
    const row = (await prisma.product.findUnique({
      where: { handle: slug },
      select: { ...productSelect, description: true, descriptionFr: true },
    })) as (ProductRow & { description: string | null; descriptionFr: string | null }) | null;
    if (!row) return null;
    const [withRating] = await attachRatings([row]);
    return { ...row, rating: withRating.rating, ratingCount: withRating.ratingCount };
  },
  ['catalog:product'],
  { revalidate: CATALOG_TTL, tags: [CATALOG_TAG] },
);

export const getProduct = cache((handle: string) => fetchProduct(handle));

const fetchRelated = unstable_cache(
  async (slug: string, category: string): Promise<ProductRow[]> => {
    const rows = (await prisma.product.findMany({
      where: { category: { handle: category }, NOT: { handle: slug } },
      take: 4,
      orderBy: { priceCents: 'asc' },
      select: productSelect,
    })) as ProductRow[];
    return attachRatings(rows);
  },
  ['catalog:related'],
  { revalidate: CATALOG_TTL, tags: [CATALOG_TAG] },
);

export const getRelated = cache((handle: string, categoryHandle: string) => fetchRelated(handle, categoryHandle));

const fetchPrices = unstable_cache(
  async (list: string[]) => {
    const rows = await prisma.product.findMany({
      where: { handle: { in: list } },
      select: productSelect,
    });
    return rows as ProductRow[];
  },
  ['catalog:prices'],
  // Carts re-check real prices when the order is placed, so a short window is safe.
  { revalidate: 60, tags: [CATALOG_TAG] },
);

export async function priceProducts(handles: string[]) {
  return fetchPrices([...new Set(handles)].sort());
}
