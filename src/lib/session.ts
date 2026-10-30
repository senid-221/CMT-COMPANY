import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export function sessionConfigured() {
  const value = process.env.AUTH_SECRET;
  return !!value && value.length >= 32;
}

function secret(): string | null {
  const value = process.env.AUTH_SECRET;
  return value && value.length >= 32 ? value : null;
}

function sign(payload: string, key: string) {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export async function readSession(cookieName: string): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const raw = (await cookies()).get(cookieName)?.value;
  if (!raw) return null;

  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [id, expires, signature] = parts;
  if (!id || !expires || !signature) return null;

  const expected = Buffer.from(sign(`${id}.${expires}`, key));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (!Number(expires) || Number(expires) < Date.now()) return null;

  return id;
}

export async function writeSession(cookieName: string, id: string, ttlMs: number) {
  const key = secret();
  if (!key) throw new Error('AUTH_SECRET is not configured');
  const payload = `${id}.${Date.now() + ttlMs}`;
  (await cookies()).set(cookieName, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(ttlMs / 1000),
  });
}

export async function clearSession(cookieName: string) {
  (await cookies()).delete(cookieName);
}
