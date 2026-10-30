import { NextResponse } from 'next/server';
import { normalizeTrack, recordPageView } from '@/lib/analytics';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (rateLimited(ip, 240, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });

  const lengthHeader = Number(request.headers.get('content-length') ?? '0');
  if (lengthHeader > 4_000) return NextResponse.json({ ok: false }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const input = normalizeTrack((body ?? {}) as Record<string, unknown>);
  if (!input) return NextResponse.json({ ok: false }, { status: 422 });

  await recordPageView(input);
  return NextResponse.json({ ok: true }, { status: 201 });
}
