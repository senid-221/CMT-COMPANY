'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';

type StripItem = { handle: string; label: string };

export function CategoryStrip({ items }: { items: StripItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  const nudge = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={sync}
        className="hide-scrollbar flex gap-1 overflow-x-auto py-2 text-[13px]"
      >
        {items.map((item) => (
          <Link
            key={item.handle}
            href={`/category/${item.handle}`}
            className="whitespace-nowrap rounded-full border border-line bg-canvas px-2 py-1 font-medium text-ink/80 hover:border-brand hover:text-brand"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {edges.left ? (
        <div className="absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-surface-alt via-surface-alt to-transparent pr-8">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Scroll categories left"
            className="grid h-7 w-7 place-items-center rounded-full border border-line bg-canvas text-ink/70 shadow-sm hover:text-brand"
          >
            <ChevronLeftIcon size={15} />
          </button>
        </div>
      ) : null}

      {edges.right ? (
        <div className="absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-surface-alt via-surface-alt to-transparent pl-8">
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Scroll categories right"
            className="grid h-7 w-7 place-items-center rounded-full border border-line bg-canvas text-ink/70 shadow-sm hover:text-brand"
          >
            <ChevronRightIcon size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
