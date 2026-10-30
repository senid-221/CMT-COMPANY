import { createHash, randomBytes } from 'node:crypto';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export const GOOGLE_STATE_COOKIE = 'cmb_google_state';
const STATE_TTL_SECONDS = 600;

export type GoogleState = { state: string; verifier: string; next: string };

export type GoogleProfile = { googleId: string; email: string; name: string | null };

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/api/auth/google/callback`;
}

export function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/account';
  return value;
}

export function createGoogleState(next: string): { state: string; verifier: string; challenge: string; cookie: string } {
  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const payload: GoogleState = { state, verifier, next };
  return { state, verifier, challenge, cookie: Buffer.from(JSON.stringify(payload)).toString('base64url') };
}

export function readGoogleState(cookie: string | undefined): GoogleState | null {
  if (!cookie) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8')) as Partial<GoogleState>;
    if (typeof parsed.state !== 'string' || typeof parsed.verifier !== 'string') return null;
    return { state: parsed.state, verifier: parsed.verifier, next: safeNext(parsed.next ?? null) };
  } catch {
    return null;
  }
}

export function googleStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: STATE_TTL_SECONDS,
  };
}

export function googleAuthorizeUrl({ state, challenge }: { state: string; challenge: string }) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, verifier: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: googleRedirectUri(),
        code_verifier: verifier,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
  return typeof data?.access_token === 'string' ? data.access_token : null;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile | null> {
  let response: Response;
  try {
    response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as {
    sub?: unknown;
    email?: unknown;
    email_verified?: unknown;
    name?: unknown;
  } | null;
  if (typeof data?.sub !== 'string' || typeof data.email !== 'string' || data.email_verified !== true) return null;
  const email = data.email.trim().toLowerCase();
  if (!email) return null;
  const name = typeof data.name === 'string' ? data.name.trim().slice(0, 80) : '';
  return { googleId: data.sub, email, name: name || null };
}
