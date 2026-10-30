import Link from 'next/link';

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

const MESSAGES: Record<string, string> = {
  saved: 'Changes saved.',
  deleted: 'Deleted.',
  invalid: 'Some fields were invalid. Nothing was changed.',
  'duplicate-handle': 'That product handle is already used.',
  'insufficient-stock': 'Not enough stock to reopen this order. Restock the products first.',
};

export function Flash({ saved, deleted, error }: { saved?: string; deleted?: string; error?: string }) {
  const key = error ? error : deleted ? 'deleted' : saved ? 'saved' : '';
  if (!key) return null;
  const text = MESSAGES[key] ?? MESSAGES.saved;
  const tone = error ? 'border-danger/40 bg-danger/10 text-danger' : 'border-brand/30 bg-brand/10 text-brand';
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${tone}`} role={error ? 'alert' : 'status'}>
      {text}
    </div>
  );
}

const TONES: Record<string, string> = {
  placed: 'bg-info/10 text-info',
  packing: 'bg-amber/15 text-amber',
  onWay: 'bg-purple/10 text-purple',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
  new: 'bg-info/10 text-info',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  pending: 'bg-amber/15 text-amber',
};

const LABELS: Record<string, string> = {
  placed: 'Received',
  packing: 'Packing',
  onWay: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  new: 'New',
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${TONES[status] ?? 'bg-surface text-muted'}`}>
      {LABELS[status] ?? status}
    </span>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-surface-alt px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-block text-sm font-semibold text-brand hover:underline">
      ← {children}
    </Link>
  );
}

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

export function formatDay(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(value);
}
