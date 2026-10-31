'use client';

import { useCartLines } from '@/lib/cart';
import { useSavedHandles } from '@/lib/saved';

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      key={count}
      className="anim-pop absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lime px-1 text-[11px] font-bold leading-none text-lime-ink"
    >
      {count}
    </span>
  );
}

export function CartBadge() {
  const lines = useCartLines();
  return <Badge count={lines.reduce((sum, l) => sum + l.qty, 0)} />;
}

export function SavedBadge() {
  const saved = useSavedHandles();
  return <Badge count={saved.length} />;
}
