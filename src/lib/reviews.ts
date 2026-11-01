import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { prisma } from '@/lib/db';
import { activeVendorWhere } from '@/lib/vendors';

export type ReviewRow = {
  id: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
};

const fetchApprovedReviews = unstable_cache(
  async (slug: string): Promise<ReviewRow[]> => {
    const rows = await prisma.review.findMany({
      where: { product: { handle: slug }, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, author: true, rating: true, body: true, createdAt: true },
    });
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  },
  ['catalog:reviews'],
  { revalidate: 300, tags: ['catalog'] },
);

export const getApprovedReviews = cache((handle: string) => fetchApprovedReviews(handle));

export function reviewSummary(reviews: { rating: number }[]) {
  if (!reviews.length) return { count: 0, average: 0 };
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return { count: reviews.length, average: Math.round((total / reviews.length) * 10) / 10 };
}

export type ReviewInput = { handle: string; author: string; rating: number; body: string };

const AUTHOR_MAX = 40;
const BODY_MAX = 800;

export function validateReview(input: Partial<ReviewInput>) {
  const author = (input.author ?? '').replace(/\s+/g, ' ').trim().slice(0, AUTHOR_MAX);
  const body = (input.body ?? '').replace(/\s+/g, ' ').trim().slice(0, BODY_MAX);
  const rating = Math.round(Number(input.rating));
  const handle = (input.handle ?? '').trim().slice(0, 80);

  if (author.length < 2) return { ok: false as const, error: 'invalid-author' };
  if (body.length < 4) return { ok: false as const, error: 'invalid-body' };
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { ok: false as const, error: 'invalid-rating' };
  if (!handle) return { ok: false as const, error: 'invalid-product' };

  return { ok: true as const, value: { handle, author, rating, body } };
}

export async function createReview(input: Partial<ReviewInput>) {
  const parsed = validateReview(input);
  if (!parsed.ok) return parsed;

  const product = await prisma.product.findFirst({ where: { handle: parsed.value.handle, ...activeVendorWhere() }, select: { id: true } });
  if (!product) return { ok: false as const, error: 'product-not-found' };

  await prisma.review.create({
    data: { productId: product.id, author: parsed.value.author, rating: parsed.value.rating, body: parsed.value.body, status: 'pending' },
  });
  return { ok: true as const };
}

export async function productRating(handle: string) {
  const rows = await prisma.review.findMany({ where: { product: { handle }, status: 'approved' }, select: { rating: true } });
  return reviewSummary(rows);
}
