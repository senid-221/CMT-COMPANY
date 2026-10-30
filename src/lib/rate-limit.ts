const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIpFromHeaders(headers: Headers) {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'local'
  );
}

export function clientIp(request: Request) {
  return clientIpFromHeaders(request.headers);
}

export function rateLimited(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [key, value] of buckets) if (value.resetAt < now) buckets.delete(key);
    }
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}
