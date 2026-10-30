'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { endSession, requireAdmin, startSession } from '@/lib/admin/auth';
import { verifyPassword } from '@/lib/password';
import { clientIpFromHeaders, rateLimited } from '@/lib/rate-limit';
import { normalizeContent, saveContent, type SiteContent } from '@/lib/content';
import { parseMoney } from '@/lib/money';
import { ORDER_STATUSES } from '@/lib/pricing';

export type LoginState = { error: 'invalid' | 'too-many' | null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 120);
  const password = String(formData.get('password') ?? '').slice(0, 200);
  const ip = clientIpFromHeaders(await headers());

  if (rateLimited(`admin:${ip}`, 8, 15 * 60_000)) return { error: 'too-many' };
  if (!email || !password) return { error: 'invalid' };

  const admin = await prisma.adminUser.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  const valid = admin ? verifyPassword(password, admin.passwordHash) : false;
  if (!admin || !valid) {
    await sleep(350);
    return { error: 'invalid' };
  }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await startSession(admin.id);
  redirect('/admin');
}

export async function logoutAction() {
  await endSession();
  redirect('/admin/login');
}

function backTo(value: FormDataEntryValue | null, fallback: string) {
  const raw = typeof value === 'string' ? value : '';
  return raw.startsWith('/admin') ? raw : fallback;
}

export async function setOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  const returnTo = backTo(formData.get('returnTo'), '/admin/orders');
  if (!id || !(ORDER_STATUSES as readonly string[]).includes(status)) redirect(`${returnTo}?error=invalid`);

  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true, items: { select: { productId: true, quantity: true } } },
  });
  if (!order) redirect(`${returnTo}?error=invalid`);

  const restoring = status === 'cancelled' && order.status !== 'cancelled';
  const consuming = order.status === 'cancelled' && status !== 'cancelled';

  if (restoring) {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
      await tx.order.update({ where: { id }, data: { status } });
    });
  } else if (consuming) {
    const ids = order.items.map((item) => item.productId).filter((value): value is string => Boolean(value));
    const stockRows = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, stock: true } });
    const stockById = new Map(stockRows.map((row) => [row.id, row.stock]));
    const short = order.items.some((item) => item.productId && (stockById.get(item.productId) ?? 0) < item.quantity);
    if (short) redirect(`${returnTo}?error=insufficient-stock`);

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }
      await tx.order.update({ where: { id }, data: { status } });
    });
  } else {
    await prisma.order.update({ where: { id }, data: { status } });
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin');
  redirect(`${returnTo}?saved=1`);
}

function int(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Math.round(Number(String(value ?? '')));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(value: FormDataEntryValue | null, max: number) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function text(value: FormDataEntryValue | null, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

function searchName(name: string, nameFr: string) {
  return `${name} ${nameFr}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

export async function saveProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const handle = str(formData.get('handle'), 80).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const name = str(formData.get('name'), 80);
  const nameFr = str(formData.get('nameFr'), 80);
  const unit = str(formData.get('unit'), 30);
  const image = text(formData.get('image'), 300);
  const description = text(formData.get('description'), 600) || null;
  const descriptionFr = text(formData.get('descriptionFr'), 600) || null;
  const priceCents = parseMoney(formData.get('price'));
  const compareAtRaw = String(formData.get('compareAt') ?? '').trim();
  const compareAtCents = compareAtRaw ? parseMoney(compareAtRaw) : null;
  const stock = int(formData.get('stock'));
  const featured = formData.get('featured') === 'on';
  const categoryId = String(formData.get('categoryId') ?? '');
  const sellerIdRaw = String(formData.get('sellerId') ?? '');
  const target = id ? `/admin/products/${id}/edit` : '/admin/products/new';
  const seller = sellerIdRaw ? await prisma.seller.findUnique({ where: { id: sellerIdRaw }, select: { id: true } }) : null;
  if (sellerIdRaw && !seller) redirect(`${target}?error=invalid`);

  if (handle.length < 2 || name.length < 2 || !unit) redirect(`${target}?error=invalid`);
  if (priceCents <= 0 || priceCents > 100_000_000 || stock < 0 || stock > 100_000) redirect(`${target}?error=invalid`);
  if (compareAtCents !== null && (compareAtCents <= priceCents || compareAtCents > 100_000_000)) redirect(`${target}?error=invalid`);
  if (!(image.startsWith('/') || image.startsWith('https://')) || image.startsWith('//')) redirect(`${target}?error=invalid`);

  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) redirect(`${target}?error=invalid`);

  const duplicate = await prisma.product.findFirst({ where: { handle, NOT: id ? { id } : {} }, select: { id: true } });
  if (duplicate) redirect(`${target}?error=duplicate-handle`);

  const data = {
    handle,
    name,
    nameFr: nameFr || null,
    searchName: searchName(name, nameFr),
    description,
    descriptionFr,
    unit,
    priceCents,
    compareAtCents,
    image,
    featured,
    stock,
    categoryId,
    sellerId: seller?.id ?? null,
  };

  if (id) {
    await prisma.product.update({ where: { id }, data });
  } else {
    await prisma.product.create({ data });
  }

  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath(`/product/${handle}`);
  redirect('/admin/products?saved=1');
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/admin/products?error=invalid');
  await prisma.product.delete({ where: { id } }).catch(() => null);
  revalidatePath('/');
  revalidatePath('/shop');
  redirect('/admin/products?deleted=1');
}

export async function setSellerStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['new', 'approved', 'rejected'].includes(status)) redirect('/admin/sellers?error=invalid');
  await prisma.sellerApplication.update({ where: { id }, data: { status } });
  revalidatePath('/admin/sellers');
  revalidatePath('/admin');
  redirect('/admin/sellers?saved=1');
}

export async function setReviewStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['pending', 'approved', 'rejected'].includes(status)) redirect('/admin/reviews?error=invalid');
  const review = await prisma.review.update({
    where: { id },
    data: { status },
    select: { product: { select: { handle: true } } },
  });
  revalidatePath('/admin/reviews');
  revalidatePath(`/product/${review.product.handle}`);
  redirect('/admin/reviews?saved=1');
}

export async function deleteReview(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/admin/reviews?error=invalid');
  const review = await prisma.review.delete({
    where: { id },
    select: { product: { select: { handle: true } } },
  }).catch(() => null);
  if (review) revalidatePath(`/product/${review.product.handle}`);
  revalidatePath('/admin/reviews');
  redirect('/admin/reviews?deleted=1');
}

export async function saveSiteContent(formData: FormData) {
  await requireAdmin();
  const handles = String(formData.get('featuredHandles') ?? '')
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
  const existing = await prisma.product.findMany({ where: { handle: { in: handles } }, select: { handle: true } });
  const allowed = new Set(existing.map((row) => row.handle));

  const content: SiteContent = normalizeContent({
    announcement: {
      enabled: formData.get('announcementEnabled') === 'on',
      text: { en: formData.get('announcementEn'), fr: formData.get('announcementFr') },
    },
    hero: {
      title: { en: formData.get('heroTitleEn'), fr: formData.get('heroTitleFr') },
      text: { en: formData.get('heroTextEn'), fr: formData.get('heroTextFr') },
      ctaLabel: { en: formData.get('ctaLabelEn'), fr: formData.get('ctaLabelFr') },
      ctaHref: formData.get('ctaHref'),
    },
    delivery: { note: { en: formData.get('deliveryNoteEn'), fr: formData.get('deliveryNoteFr') } },
    featured: { handles: handles.filter((handle) => allowed.has(handle)) },
  });

  await saveContent(content);
  revalidatePath('/', 'layout');
  redirect('/admin/content?saved=1');
}
