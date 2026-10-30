import { Prisma } from '@prisma/client';
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

export async function getCategories(): Promise<CategoryRow[]> {
  return prisma.category.findMany({
    where: { products: { some: {} } },
    select: { handle: true, name: true, nameFr: true, image: true },
    orderBy: { sort: 'asc' },
  });
}

export async function getCategory(handle: string) {
  return prisma.category.findUnique({ where: { handle }, select: { handle: true, name: true, nameFr: true, image: true } });
}

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

export async function getProducts(
  opts: { q?: string; category?: string; sort?: SortKey; take?: number; deals?: boolean; minRating?: number } = {},
) {
  const { q, category, sort = 'name', take, deals, minRating } = opts;
  const needle = (q ?? '').toLowerCase().trim();
  const rows = (await prisma.product.findMany({
    where: {
      ...(category ? { category: { handle: category } } : {}),
      ...(needle ? { searchName: { contains: needle } } : {}),
      ...(deals ? { compareAtCents: { not: null } } : {}),
    },
    orderBy: ORDER_BY[sort],
    select: productSelect,
  })) as ProductRow[];

  let result = await attachRatings(rows);
  if (minRating) result = result.filter((row) => (row.rating ?? 0) >= minRating);
  if (sort === 'rating') {
    result = result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0) || a.name.localeCompare(b.name));
  }
  return take ? result.slice(0, take) : result;
}

export async function getDeals(take = 8): Promise<ProductRow[]> {
  return getProducts({ deals: true, take, sort: 'price-asc' });
}

export async function getFeatured(): Promise<ProductRow[]> {
  const rows = (await prisma.product.findMany({
    where: { featured: true },
    orderBy: { name: 'asc' },
    take: 10,
    select: productSelect,
  })) as ProductRow[];
  return attachRatings(rows);
}

export async function getProductsByHandles(handles: string[]): Promise<ProductRow[]> {
  if (!handles.length) return [];
  const rows = (await prisma.product.findMany({
    where: { handle: { in: handles.slice(0, 12) } },
    select: productSelect,
  })) as ProductRow[];
  const order = new Map(handles.map((handle, index) => [handle, index]));
  rows.sort((a, b) => (order.get(a.handle) ?? 99) - (order.get(b.handle) ?? 99));
  return attachRatings(rows);
}

export async function getProduct(handle: string): Promise<(ProductRow & { description: string | null; descriptionFr: string | null }) | null> {
  const row = (await prisma.product.findUnique({
    where: { handle },
    select: { ...productSelect, description: true, descriptionFr: true },
  })) as (ProductRow & { description: string | null; descriptionFr: string | null }) | null;
  if (!row) return null;
  const [withRating] = await attachRatings([row]);
  return { ...row, rating: withRating.rating, ratingCount: withRating.ratingCount };
}

export async function getRelated(handle: string, categoryHandle: string): Promise<ProductRow[]> {
  const rows = (await prisma.product.findMany({
    where: { category: { handle: categoryHandle }, NOT: { handle } },
    take: 4,
    orderBy: { priceCents: 'asc' },
    select: productSelect,
  })) as ProductRow[];
  return attachRatings(rows);
}

export async function priceProducts(handles: string[]) {
  const rows = await prisma.product.findMany({
    where: { handle: { in: handles } },
    select: { ...productSelect, description: false },
  });
  return rows as ProductRow[];
}
