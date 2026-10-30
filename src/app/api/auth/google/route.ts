import { NextResponse, type NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { clientIpFromHeaders, rateLimited } from '@/lib/rate-limit';
import {
  GOOGLE_STATE_COOKIE,
  createGoogleState,
  googleAuthorizeUrl,
  googleConfigured,
  googleStateCookieOptions,
  safeNext,
} from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (!googleConfigured()) return NextResponse.redirect(new URL('/login?error=google', url));

  const ip = clientIpFromHeaders(await headers());
  if (rateLimited(`google-start:${ip}`, 20, 15 * 60_000)) {
    return NextResponse.redirect(new URL('/login?error=google', url));
  }

  const { state, challenge, cookie } = createGoogleState(safeNext(url.searchParams.get('next')));
  const response = NextResponse.redirect(googleAuthorizeUrl({ state, challenge }));
  response.cookies.set(GOOGLE_STATE_COOKIE, cookie, googleStateCookieOptions());
  return response;
}
