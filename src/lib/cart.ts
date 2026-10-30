'use client';

import { useSyncExternalStore } from 'react';

export type CartLine = { handle: string; qty: number };

const KEY = 'cmb_cart_v1';
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();

let cache: CartLine[] | null = null;
let cacheString = '';

function read(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => l && typeof l.handle === 'string' && Number.isFinite(Number(l.qty)))
      .map((l) => ({ handle: l.handle as string, qty: Math.max(0, Math.min(99, Math.round(Number(l.qty)))) }))
      .filter((l) => l.qty > 0);
  } catch {
    return [];
  }
}

function snapshot(): CartLine[] {
  if (!cache) cache = read();
  return cache;
}

function version(): string {
  if (!cache) cache = read();
  return cacheString || (cacheString = JSON.stringify(cache));
}

function write(lines: CartLine[]) {
  cache = lines;
  cacheString = JSON.stringify(lines);
  window.localStorage.setItem(KEY, cacheString);
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cacheString = '';
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

function empty(): CartLine[] {
  return EMPTY;
}

export function setQty(handle: string, qty: number) {
  const lines = snapshot().slice();
  const i = lines.findIndex((l) => l.handle === handle);
  const clean = Math.max(0, Math.min(99, Math.round(qty)));
  if (i === -1) {
    if (clean > 0) lines.push({ handle, qty: clean });
  } else if (clean === 0) {
    lines.splice(i, 1);
  } else {
    lines[i] = { ...lines[i], qty: clean };
  }
  write(lines);
}

export function addQty(handle: string, delta: number) {
  const current = snapshot().find((l) => l.handle === handle)?.qty ?? 0;
  setQty(handle, current + delta);
}

export function clearCart() {
  write([]);
}

export function useCartLines(): CartLine[] {
  return useSyncExternalStore(subscribe, snapshot, empty);
}

export function useCartVersion(): string {
  return useSyncExternalStore(subscribe, version, () => '');
}

export function qtyOf(lines: CartLine[], handle: string) {
  return lines.find((l) => l.handle === handle)?.qty ?? 0;
}
