const HOST_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;
const UNROUTABLE = new Set(['0.0.0.0', '[::]', '::']);

/**
 * Origin for browser-facing redirects. The configured origin wins so that a proxy
 * rewriting Host cannot send the browser to the container's bind address (0.0.0.0).
 */
export function publicOrigin(requestUrl: string) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
  if (configured) {
    try {
      const { origin, hostname } = new URL(configured);
      if (HOST_PATTERN.test(hostname) && !UNROUTABLE.has(hostname)) return origin;
    } catch {
      // Fall through to the request origin.
    }
  }
  return new URL(requestUrl).origin;
}
