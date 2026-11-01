import { NextResponse } from 'next/server';
import { getCustomer } from '@/lib/customer/auth';
import { getMarket } from '@/lib/market';
import { clientIp, rateLimited } from '@/lib/rate-limit';
import { chatOrdersEnabled, placeDraftOrder } from '@/lib/chat-draft';

export const runtime = 'nodejs';

const LIMIT = 6;
const WINDOW_MS = 60_000;

export async function POST(request: Request) {
  if (!chatOrdersEnabled()) {
    return NextResponse.json({ error: 'orders-unavailable' }, { status: 503 });
  }

  const ip = clientIp(request);
  if (rateLimited(`chat-order:${ip}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ error: 'too-many' }, { status: 429 });
  }

  if (Number(request.headers.get('content-length') ?? '0') > 8_000) {
    return NextResponse.json({ error: 'too-large' }, { status: 413 });
  }

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token.slice(0, 8_000) : '';
  if (!token) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const [customer, market] = await Promise.all([getCustomer(), getMarket()]);
  const result = await placeDraftOrder({ token, ip, customer, market, request });
  if (!result.ok) {
    const status =
      result.error === 'expired'
        ? 410
        : result.error === 'duplicate' || result.error === 'market-changed'
          ? 409
          : 422;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
