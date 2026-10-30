import Link from 'next/link';
import { visitorStats } from '@/lib/analytics';
import { PageHeader } from '@/components/admin/ui';

const RANGES = [7, 30, 90];

export default async function AdminVisitorsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days = '30' } = await searchParams;
  const range = RANGES.includes(Number(days)) ? Number(days) : 30;
  const stats = await visitorStats(range);
  const peak = Math.max(1, ...stats.daily.map((point) => point.views));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Visitors"
        description="First-party page views collected on this site."
        action={
          <div className="flex gap-2">
            {RANGES.map((value) => (
              <Link
                key={value}
                href={`/admin/visitors?days=${value}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  range === value ? 'border-brand bg-brand text-white' : 'border-line bg-canvas hover:border-brand'
                }`}
              >
                {value} days
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Page views', value: stats.totals.views },
          { label: 'Unique visitors', value: stats.totals.visitors },
          { label: 'Views today', value: stats.totals.todayViews },
          { label: 'Visitors today', value: stats.totals.todayVisitors },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="card p-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Page views per day</h2>
        <div className="flex h-36 items-end gap-1 overflow-x-auto">
          {stats.daily.map((point) => (
            <div key={point.date} className="flex min-w-[10px] flex-1 flex-col items-center gap-1" title={`${point.date}: ${point.views} views, ${point.visitors} visitors`}>
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t bg-brand/70" style={{ height: `${Math.max(point.views ? 3 : 0, Math.round((point.views / peak) * 110))}px` }} />
              </div>
              {range <= 30 ? <span className="text-[9px] text-muted">{point.date.slice(8)}</span> : null}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 font-display text-lg font-semibold">Top pages</h2>
          {stats.topPaths.length ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2">Path</th>
                  <th className="px-4 py-2 text-right">Views</th>
                  <th className="px-4 py-2 text-right">Visitors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.topPaths.map((row) => (
                  <tr key={row.path}>
                    <td className="max-w-[280px] truncate px-4 py-2 font-medium">{row.path}</td>
                    <td className="px-4 py-2 text-right">{row.views}</td>
                    <td className="px-4 py-2 text-right text-muted">{row.visitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-muted">No page view recorded yet.</p>
          )}
        </section>

        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-2 font-display text-lg font-semibold">Sources</h2>
            {stats.referrers.length ? (
              <ul className="space-y-1.5 text-sm">
                {stats.referrers.map((row) => (
                  <li key={row.host} className="flex justify-between gap-3">
                    <span className="truncate">{row.host}</span>
                    <span className="font-semibold">{row.visits}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing yet.</p>
            )}
          </section>

          <section className="card p-4">
            <h2 className="mb-2 font-display text-lg font-semibold">Devices</h2>
            {stats.devices.length ? (
              <ul className="space-y-1.5 text-sm">
                {stats.devices.map((row) => (
                  <li key={row.device} className="flex justify-between gap-3">
                    <span className="capitalize">{row.device}</span>
                    <span className="font-semibold">{row.visits}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
