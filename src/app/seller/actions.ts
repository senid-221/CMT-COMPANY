'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import { endSellerSession, requireSeller, startSellerSession } from '@/lib/seller/auth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { clientIpFromHeaders, rateLimited } from '@/lib/rate-limit';
import { parseMoney } from '@/lib/money';

export type SellerAuthState = { error: 'invalid' | 'exists' | 'bad-email' | 'short-password' | 'too-many' | 'failed' | null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function str(value: FormDataEntryValue | null, max: number) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function text(value: FormDataEntryValue | null, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

function int(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Math.round(Number(String(value ?? '')));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function searchName(name: string, nameFr: string) {
  return `${name} ${nameFr}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

export async function loginSeller(_prev: SellerAuthState, formData: FormData): Promise<SellerAuthState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 120);
  const password = String(formData.get('password') ?? '').slice(0, 200);
  const ip = clientIpFromHeaders(await headers());

  if (rateLimited(`seller-login:${ip}`, 10, 15 * 60_000)) return { error: 'too-many' };
  if (!email || !password) return { error: 'invalid' };

  const seller = await prisma.seller.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  const valid = seller ? verifyPassword(password, seller.passwordHash) : false;
  if (!seller || !valid) {
    await sleep(350);
    return { error: 'invalid' };
  }

  await prisma.seller.update({ where: { id: seller.id }, data: { lastLoginAt: new Date() } });
  await startSellerSession(seller.id);
  redirect('/seller');
}

export async function registerSeller(_prev: SellerAuthState, formData: FormData): Promise<SellerAuthState> {
  const name = str(formData.get('name'), 80);
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 120);
  const phone = str(formData.get('phone'), 30) || null;
  const password = String(formData.get('password') ?? '');
  const ip = clientIpFromHeaders(await headers());

  if (rateLimited(`seller-signup:${ip}`, 6, 15 * 60_000)) return { error: 'too-many' };
  if (name.length < 2) return { error: 'invalid' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'bad-email' };
  if (password.length < 8) return { error: 'short-password' };

  const existing = await prisma.seller.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: 'exists' };

  const seller = await prisma.seller.create({
    data: { name, email, phone, passwordHash: hashPassword(password) },
    select: { id: true },
  });
  await startSellerSession(seller.id);
  redirect('/seller');
}

export async function logoutSeller() {
  await endSellerSession();
  redirect('/seller/login');
}

export async function saveSellerProduct(formData: FormData) {
  const seller = await requireSeller();
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
  const categoryId = String(formData.get('categoryId') ?? '');

  const target = id ? `/seller/products/${id}/edit` : '/seller/products/new';
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
    stock,
    categoryId,
  };

  if (id) {
    const owned = await prisma.product.findFirst({ where: { id, sellerId: seller.id }, select: { id: true } });
    if (!owned) redirect('/seller?error=not-found');
    await prisma.product.update({ where: { id }, data });
  } else {
    await prisma.product.create({ data: { ...data, featured: false, sellerId: seller.id } });
  }

  revalidateTag('catalog');
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath(`/product/${handle}`);
  revalidatePath('/seller');
  redirect('/seller?saved=1');
}

export async function deleteSellerProduct(formData: FormData) {
  const seller = await requireSeller();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/seller?error=invalid');
  const result = await prisma.product.deleteMany({ where: { id, sellerId: seller.id } });
  if (!result.count) redirect('/seller?error=not-found');
  revalidateTag('catalog');
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/seller');
  redirect('/seller?deleted=1');
}
