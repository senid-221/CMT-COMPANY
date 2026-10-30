import { prisma } from '@/lib/db';

export type TrackInput = { path: string; referrer: string | null; device: string; visitorId: string };

const DEVICES = ['desktop', 'tablet', 'mobile'] as const;

export function normalizeTrack(input: Record<string, unknown>): TrackInput | null {
  const path = typeof input.path === 'string' ? input.path.trim().slice(0, 200) : '';
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (path.startsWith('/admin') || path.startsWith('/api')) return null;

  const visitorId = typeof input.visitorId === 'string' ? input.visitorId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) : '';
  if (visitorId.length < 8) return null;

  const device = typeof input.device === 'string' && (DEVICES as readonly string[]).includes(input.device) ? input.device : 'desktop';

  let referrer: string | null = null;
  if (typeof input.referrer === 'string' && input.referrer.trim()) {
    try {
      referrer = new URL(input.referrer.trim()).hostname.toLowerCase().slice(0, 100);
    } catch {
      referrer = null;
    }
  }

  return { path, referrer, device, visitorId };
}

export async function recordPageView(input: TrackInput) {
  await prisma.pageView.create({ data: input });
}

export type DailyPoint = { date: string; views: number; visitors: number };
export type PathRow = { path: string; views: number; visitors: number };

export type VisitorStats = {
  days: number;
  totals: { views: number; visitors: number; todayViews: number; todayVisitors: number };
  daily: DailyPoint[];
  topPaths: PathRow[];
  referrers: { host: string; visits: number }[];
  devices: { device: string; visits: number }[];
};

function dayKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function visitorStats(days = 30): Promise<VisitorStats> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await prisma.pageView.findMany({
    where: { createdAt: { gte: start } },
    select: { path: true, referrer: true, device: true, visitorId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 100_000,
  });

  const daily = new Map<string, { views: number; visitors: Set<string> }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    daily.set(dayKey(d), { views: 0, visitors: new Set() });
  }

  const allVisitors = new Set<string>();
  const todayKey = dayKey(new Date());
  const todayVisitors = new Set<string>();
  let todayViews = 0;
  const paths = new Map<string, { views: number; visitors: Set<string> }>();
  const referrers = new Map<string, number>();
  const devices = new Map<string, number>();

  for (const row of rows) {
    const key = dayKey(row.createdAt);
    const bucket = daily.get(key);
    if (bucket) {
      bucket.views += 1;
      bucket.visitors.add(row.visitorId);
    }
    allVisitors.add(row.visitorId);
    if (key === todayKey) {
      todayViews += 1;
      todayVisitors.add(row.visitorId);
    }

    const pathRow = paths.get(row.path) ?? { views: 0, visitors: new Set<string>() };
    pathRow.views += 1;
    pathRow.visitors.add(row.visitorId);
    paths.set(row.path, pathRow);

    referrers.set(row.referrer ?? 'Direct', (referrers.get(row.referrer ?? 'Direct') ?? 0) + 1);
    devices.set(row.device, (devices.get(row.device) ?? 0) + 1);
  }

  return {
    days,
    totals: { views: rows.length, visitors: allVisitors.size, todayViews, todayVisitors: todayVisitors.size },
    daily: [...daily].map(([date, v]) => ({ date, views: v.views, visitors: v.visitors.size })),
    topPaths: [...paths]
      .map(([path, v]) => ({ path, views: v.views, visitors: v.visitors.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 12),
    referrers: [...referrers]
      .map(([host, visits]) => ({ host, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8),
    devices: [...devices]
      .map(([device, visits]) => ({ device, visits }))
      .sort((a, b) => b.visits - a.visits),
  };
}
