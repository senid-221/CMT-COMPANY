import { prisma } from '@/lib/db';

export type SellerInput = {
  storeName: string;
  contactName: string;
  phone: string;
  city: string;
  categories: string;
  message: string | null;
};

const LIMITS = { storeName: 80, contactName: 60, phone: 20, city: 40, categories: 120, message: 600 };

function clean(value: string, max: number) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export function validateSeller(input: Partial<SellerInput>) {
  const storeName = clean(input.storeName ?? '', LIMITS.storeName);
  const contactName = clean(input.contactName ?? '', LIMITS.contactName);
  const phone = clean(input.phone ?? '', LIMITS.phone);
  const city = clean(input.city ?? '', LIMITS.city);
  const categories = clean(input.categories ?? '', LIMITS.categories);
  const message = clean(input.message ?? '', LIMITS.message);

  if (!storeName || !contactName || !city || !categories) return { ok: false as const, error: 'invalid-fields' };
  if (!/^\+?[0-9 ]{7,15}$/.test(phone)) return { ok: false as const, error: 'invalid-phone' };

  return { ok: true as const, value: { storeName, contactName, phone, city, categories, message: message || null } };
}

export async function createSellerApplication(input: Partial<SellerInput>) {
  const parsed = validateSeller(input);
  if (!parsed.ok) return parsed;
  const row = await prisma.sellerApplication.create({ data: parsed.value, select: { id: true } });
  return { ok: true as const, id: row.id };
}
