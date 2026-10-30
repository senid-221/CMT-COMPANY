'use client';

import { useEffect, useState } from 'react';
import type { ProductRow } from './catalog';

export function usePricedHandles(handles: string[]): { key: string; products: ProductRow[] } | null {
  const key = handles.join(',');
  const [state, setState] = useState<{ key: string; products: ProductRow[] } | null>(null);

  useEffect(() => {
    if (!key) {
      setState({ key, products: [] });
      return;
    }
    let alive = true;
    fetch(`/api/cart?handles=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => alive && setState({ key, products: d.lines as ProductRow[] }))
      .catch(() => alive && setState({ key, products: [] }));
    return () => {
      alive = false;
    };
  }, [key]);

  return state;
}
