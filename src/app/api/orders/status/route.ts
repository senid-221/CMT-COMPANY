import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (rateLimited(clientIp(request), 60, 60_000)) return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });

  const numbers = [
    ...new Set(
      new URL(request.url).searchParams
        .get('numbers')
        ?.split(',')
        .map((n) => n.trim().toUpperCase())
        .filter((n) => /^CMB-[0-9]{6}$/.test(n)) ?? [],
    ),
  ].slice(0, 20);

  if (!numbers.length) return NextResponse.json({ orders: [] });

  const rows = await prisma.order.findMany({
    where: { number: { in: numbers } },
    select: { number: true, status: true, placedAt: true, slot: true, totalCents: true, _count: { select: { items: true } } },
    orderBy: { placedAt: 'desc' },
  });

  return NextResponse.json({
    orders: rows.map((r) => ({
      number: r.number,
      status: r.status,
      placedAt: r.placedAt.toISOString(),
      slot: r.slot,
      totalCents: r.totalCents,
      itemCount: r._count.items,
    })),
  });
}
