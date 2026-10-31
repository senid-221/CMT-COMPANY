const TARGET_ATTR = 'data-cart-target';

export function flyToCart(source: HTMLElement, image?: string) {
  if (typeof window === 'undefined') return;
  if (typeof source.animate !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const target = document.querySelector<HTMLElement>(`[${TARGET_ATTR}]`);
  if (!target) return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !from.height || !to.width || !to.height) return;

  const size = Math.round(Math.min(96, Math.max(56, from.width * 0.7)));
  const el = document.createElement('div');
  el.className = 'flyer';
  el.setAttribute('aria-hidden', 'true');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.left = '0';
  el.style.top = '0';

  if (image) {
    el.style.background = 'var(--color-canvas)';
    const img = document.createElement('img');
    img.src = image;
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;padding:6px;box-sizing:border-box';
    el.appendChild(img);
  } else {
    el.style.background = 'var(--color-brand-solid)';
    el.style.borderRadius = '9999px';
  }

  document.body.appendChild(el);

  const x0 = from.left + from.width / 2 - size / 2;
  const y0 = from.top + from.height / 2 - size / 2;
  const x1 = to.left + to.width / 2 - size / 2;
  const y1 = to.top + to.height / 2 - size / 2;
  const peak = Math.min(y0, y1) - 80 - Math.abs(x1 - x0) * 0.1;

  try {
    const flight = el.animate(
      [
        { transform: `translate(${x0}px, ${y0}px) scale(1) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${(x0 + x1) / 2}px, ${peak}px) scale(0.82) rotate(14deg)`, opacity: 0.95, offset: 0.5 },
        { transform: `translate(${x1}px, ${y1}px) scale(0.16) rotate(26deg)`, opacity: 0.3 },
      ],
      { duration: 680, easing: 'cubic-bezier(.36,.07,.19,.97)' },
    );
    flight.onfinish = () => el.remove();
    flight.oncancel = () => el.remove();
  } catch {
    el.remove();
  }
}
