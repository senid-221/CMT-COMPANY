import { NextResponse } from 'next/server';
import { createReview } from '@/lib/reviews';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (rateLimited(ip, 5, 60_000)) return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });

  const lengthHeader = Number(request.headers.get('content-length') ?? '0');
  if (lengthHeader > 8_000) return NextResponse.json({ error: 'payload-too-large' }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '');

  const result = await createReview({
    handle: text('handle'),
    author: text('author'),
    rating: Number(input.rating),
    body: text('body'),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ status: 'pending' }, { status: 201 });
}
