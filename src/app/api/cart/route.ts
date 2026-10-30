import { NextResponse } from 'next/server';
import { priceProducts } from '@/lib/catalog';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('handles') ?? '';
  const handles = [...new Set(raw.split(',').map((h) => h.trim()).filter(Boolean))].slice(0, 100);
  if (!handles.length) return NextResponse.json({ lines: [] });

  const products = await priceProducts(handles);
  return NextResponse.json({
    lines: products.map((p) => ({
      handle: p.handle,
      name: p.name,
      nameFr: p.nameFr,
      unit: p.unit,
      priceCents: p.priceCents,
      image: p.image,
      stock: p.stock,
      featured: p.featured,
      category: p.category,
    })),
  });
}
