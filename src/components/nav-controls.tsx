'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { t, type Locale } from '@/lib/i18n';
import { THEME_KEY } from '@/lib/theme';
import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from '@/components/icons';

export type MenuItem = { href: string; label: string };

export function MenuButton({ items, locale }: { items: MenuItem[]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t(locale, 'nav.menu')}
        className="grid h-10 w-10 max-[399px]:h-9 max-[399px]:w-9 place-items-center rounded-full border border-line bg-canvas text-ink transition hover:border-brand hover:text-brand"
      >
        {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
      </button>
      {open ? (
        <div className="card absolute left-0 top-12 z-40 w-60 p-1.5 shadow-lg sm:left-auto sm:right-0">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-hover hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ThemeToggle({ locale }: { locale: Locale }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? t(locale, 'theme.light') : t(locale, 'theme.dark')}
      className="grid h-10 w-10 max-[399px]:h-9 max-[399px]:w-9 place-items-center rounded-full text-ink transition hover:bg-hover hover:text-brand"
    >
      {dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  );
}
