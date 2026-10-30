'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

export type OrderRef = { number: string; phone: string; placedAt: string };

export type OrderStatus = {
  number: string;
  status: string;
  placedAt: string;
  slot: string;
  totalCents: number;
  itemCount: number;
};

const KEY = 'cmb_orders_v1';
const EMPTY: OrderRef[] = [];
const listeners = new Set<() => void>();

let cache: OrderRef[] | null = null;

function read(): OrderRef[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter((r) => r && typeof r.number === 'string' && typeof r.phone === 'string')
      .map((r) => ({ number: r.number, phone: r.phone, placedAt: typeof r.placedAt === 'string' ? r.placedAt : '' }))
      .slice(0, 20);
  } catch {
    return EMPTY;
  }
}

function snapshot(): OrderRef[] {
  if (!cache) cache = read();
  return cache;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function recordOrder(ref: OrderRef) {
  const next = [ref, ...snapshot().filter((r) => r.number !== ref.number)].slice(0, 20);
  cache = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  for (const l of listeners) l();
}

export function useOrderRefs(): OrderRef[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function useOrderStatuses(key: string): { key: string; orders: OrderStatus[] } | null {
  const [state, setState] = useState<{ key: string; orders: OrderStatus[] } | null>(null);

  useEffect(() => {
    if (!key) {
      setState({ key, orders: [] });
      return;
    }
    let alive = true;
    fetch(`/api/orders/status?numbers=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('status'))))
      .then((data: { orders: OrderStatus[] }) => {
        if (alive) setState({ key, orders: Array.isArray(data.orders) ? data.orders : [] });
      })
      .catch(() => {
        if (alive) setState({ key, orders: [] });
      });
    return () => {
      alive = false;
    };
  }, [key]);

  return state;
}
