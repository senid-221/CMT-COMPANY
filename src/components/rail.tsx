'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';

export function Rail({
  children,
  prevLabel,
  nextLabel,
  autoAdvance = false,
}: {
  children: React.ReactNode;
  prevLabel: string;
  nextLabel: string;
  autoAdvance?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
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

  const nudge = useCallback((direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (direction === 1 && atEnd) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (direction === -1 && el.scrollLeft <= 4) {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      return;
    }
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!autoAdvance) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (!paused.current) nudge(1);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [autoAdvance, nudge]);

  return (
    <div
      className="relative"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
    >
      <div
        ref={ref}
        onScroll={sync}
        className="rail hide-scrollbar items-stretch gap-3 pb-1"
        role="list"
      >
        {children}
      </div>

      {edges.left ? (
        <div className="absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-page via-page to-transparent pr-9">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label={prevLabel}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-canvas text-ink shadow-md transition hover:border-brand hover:text-brand active:scale-90"
          >
            <ChevronLeftIcon size={17} />
          </button>
        </div>
      ) : null}

      {edges.right ? (
        <div className="absolute inset-y-0 right-0 z-10 flex items-center bg-gradient-to-l from-page via-page to-transparent pl-9">
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label={nextLabel}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-canvas text-ink shadow-md transition hover:border-brand hover:text-brand active:scale-90"
          >
            <ChevronRightIcon size={17} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
