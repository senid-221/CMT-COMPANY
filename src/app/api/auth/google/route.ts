import { NextResponse, type NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { clientIpFromHeaders, rateLimited } from '@/lib/rate-limit';
import { publicOrigin } from '@/lib/origin';
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
  const failure = () => NextResponse.redirect(new URL('/login?error=google', publicOrigin(request.url)));

  if (!googleConfigured()) return failure();

  const ip = clientIpFromHeaders(await headers());
  if (rateLimited(`google-start:${ip}`, 20, 15 * 60_000)) return failure();

  const { state, challenge, cookie } = createGoogleState(safeNext(url.searchParams.get('next')));
  const response = NextResponse.redirect(googleAuthorizeUrl({ state, challenge }));
  response.cookies.set(GOOGLE_STATE_COOKIE, cookie, googleStateCookieOptions());
  return response;
}
