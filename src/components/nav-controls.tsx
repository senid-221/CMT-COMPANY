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
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-surface px-3 text-sm font-semibold text-ink transition hover:bg-hover hover:text-brand active:scale-[0.96]"
      >
        {open ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
        <span className="hidden min-[400px]:inline">{t(locale, 'nav.menu')}</span>
      </button>
      {open ? (
        <div className="card absolute right-0 top-[calc(100%+6px)] z-40 w-64 p-1.5 shadow-lg">
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
      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-ink transition hover:bg-hover hover:text-brand active:scale-[0.96]"
    >
      {dark ? <SunIcon size={26} /> : <MoonIcon size={26} />}
    </button>
  );
}
