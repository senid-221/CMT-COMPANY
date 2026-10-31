'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type HeroSlide = {
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  images: { src: string; alt: string }[];
};

export function HeroSlider({
  slides,
  labels,
  intervalMs = 6500,
}: {
  slides: HeroSlide[];
  /** One accessible label per slide, e.g. "Slide 1 of 3". */
  labels: string[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs]);

  if (!count) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-brand px-6 py-10 text-white sm:px-10"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {slides.map((slide, i) => (
        <div
          key={`${slide.title}-${i}`}
          aria-hidden={i !== index}
          className={
            i === index
              ? 'relative z-10 anim-fade'
              : 'pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500'
          }
        >
          <div className="relative z-10 max-w-2xl space-y-4">
            <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{slide.title}</h2>
            <p className="text-white/85">{slide.text}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={slide.ctaHref} className="btn bg-white text-brand-solid hover:bg-white/90 btn-3d btn-3d-ink">
                {slide.ctaLabel}
              </Link>
            </div>
          </div>

          {slide.images.length ? (
            <div aria-hidden className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 items-center xl:flex">
              {slide.images.slice(0, 3).map((image, j) => (
                <img
                  key={`${image.src}-${j}`}
                  src={image.src}
                  alt=""
                  width={240}
                  height={240}
                  className={[
                    'rounded-3xl bg-white p-4 shadow-xl ring-1 ring-black/5 object-contain',
                    j === 0 ? 'h-44 w-44 -rotate-6 anim-float' : j === 1 ? 'ml-[-1.75rem] h-52 w-52 rotate-2' : 'ml-[-1.75rem] h-36 w-36 rotate-6 anim-sway',
                  ].join(' ')}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}

      {count > 1 ? (
        <div className="relative z-10 mt-6 flex gap-2">
          {slides.map((slide, i) => (
            <button
              key={`dot-${slide.title}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={labels[i] ?? slide.title}
              aria-current={i === index}
              className={[
                'h-2 rounded-full transition-all duration-300',
                i === index ? 'w-7 bg-white' : 'w-2 bg-white/45 hover:bg-white/70',
              ].join(' ')}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
