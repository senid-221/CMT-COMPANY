import { NextResponse } from 'next/server';
import { createSellerApplication } from '@/lib/sellers';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (rateLimited(ip, 4, 60_000)) return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });

  const lengthHeader = Number(request.headers.get('content-length') ?? '0');
  if (lengthHeader > 16_000) return NextResponse.json({ error: 'payload-too-large' }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '');

  const result = await createSellerApplication({
    storeName: text('storeName'),
    contactName: text('contactName'),
    phone: text('phone'),
    city: text('city'),
    categories: text('categories'),
    message: text('message') || null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ id: result.id }, { status: 201 });
}
