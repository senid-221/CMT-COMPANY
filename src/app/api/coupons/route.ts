import { NextResponse } from 'next/server';
import { priceProducts } from '@/lib/catalog';
import { evaluateCode, normalizeCode, couponLabel } from '@/lib/coupons';
import { getMarket } from '@/lib/market';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** The discount preview uses our own prices for the cart handles, never a total from the browser. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (rateLimited(ip, 20, 60_000)) return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const input = body as { code?: unknown; lines?: unknown };
  const code = normalizeCode(input.code);
  if (!code) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 200 });

  const wanted = (Array.isArray(input.lines) ? input.lines.slice(0, 100) : [])
    .map((l) => {
      const line = l as { handle?: unknown; quantity?: unknown };
      return { handle: String(line.handle ?? '').slice(0, 80), quantity: Math.floor(Number(line.quantity)) };
    })
    .filter((l) => l.handle && Number.isFinite(l.quantity) && l.quantity > 0 && l.quantity <= 99);
  if (!wanted.length) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 200 });

  const [products, market] = await Promise.all([priceProducts(wanted.map((w) => w.handle)), getMarket()]);
  const priceByHandle = new Map(products.map((p) => [p.handle, p.priceCents]));
  const subtotalCents = wanted.reduce((sum, w) => sum + (priceByHandle.get(w.handle) ?? 0) * w.quantity, 0);

  const check = await evaluateCode(code, subtotalCents, market.code);
  if (!check.ok) {
    return NextResponse.json({
      ok: false,
      error: check.error,
      shortfallCents: check.shortfallCents ?? 0,
      minimumCents: subtotalCents + (check.shortfallCents ?? 0),
    });
  }

  return NextResponse.json({
    ok: true,
    code: check.coupon.code,
    discountCents: check.discountCents,
    label: couponLabel(check.coupon, 'en'),
    labelFr: couponLabel(check.coupon, 'fr'),
  });
}
