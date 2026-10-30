'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const VISITOR_KEY = 'cmb_visitor_v1';
const REFERRER_KEY = 'cmb_referrer_v1';
const sent = new Set<string>();

function visitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return '';
  }
}

function deviceKind() {
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (sent.has(pathname)) return;
    sent.add(pathname);

    let referrer = '';
    try {
      const stored = window.sessionStorage.getItem(REFERRER_KEY);
      referrer = stored ?? document.referrer ?? '';
      window.sessionStorage.setItem(REFERRER_KEY, referrer);
    } catch {
      referrer = '';
    }

    const payload = JSON.stringify({
      path: pathname.slice(0, 200),
      referrer: referrer.slice(0, 200),
      device: deviceKind(),
      visitorId: visitorId(),
    });

    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
