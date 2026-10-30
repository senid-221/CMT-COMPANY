'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'cmb_saved_v1';
const EMPTY: string[] = [];
const listeners = new Set<() => void>();

let cache: string[] | null = null;

function read(): string[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter((h) => typeof h === 'string');
  } catch {
    return EMPTY;
  }
}

function snapshot(): string[] {
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

export function toggleSaved(handle: string) {
  const current = snapshot();
  const next = current.includes(handle) ? current.filter((h) => h !== handle) : [...current, handle];
  cache = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  for (const l of listeners) l();
}

export function useSavedHandles(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
