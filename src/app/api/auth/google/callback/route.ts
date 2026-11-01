import { NextResponse, type NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { clientIpFromHeaders, rateLimited } from '@/lib/rate-limit';
import { publicOrigin } from '@/lib/origin';
import { startCustomerSession } from '@/lib/customer/auth';
import { linkGoogleCustomer } from '@/lib/customer/google-account';
import { claimGuestOrders } from '@/lib/customer/orders';
import {
  GOOGLE_STATE_COOKIE,
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleConfigured,
  googleStateCookieOptions,
  readGoogleState,
} from '@/lib/google';

export const dynamic = 'force-dynamic';

function finish(request: NextRequest, path: string, clearState = false) {
  const response = NextResponse.redirect(new URL(path, publicOrigin(request.url)));
  if (clearState) response.cookies.set(GOOGLE_STATE_COOKIE, '', { ...googleStateCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const stored = readGoogleState(request.cookies.get(GOOGLE_STATE_COOKIE)?.value);
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  const denied = url.searchParams.get('error');

  if (denied === 'access_denied') return finish(request, '/login?error=google-cancelled', true);
  if (denied) return finish(request, '/login?error=google', true);
  if (!stored || !state || stored.state !== state) return finish(request, '/login?error=google-state', true);
  if (!googleConfigured()) return finish(request, '/login?error=google', true);
  if (!code) return finish(request, '/login?error=google-state', true);

  const ip = clientIpFromHeaders(await headers());
  if (rateLimited(`google-callback:${ip}`, 30, 15 * 60_000)) return finish(request, '/login?error=google', true);

  const accessToken = await exchangeGoogleCode(code, stored.verifier);
  if (!accessToken) return finish(request, '/login?error=google', true);

  const profile = await fetchGoogleProfile(accessToken);
  if (!profile) return finish(request, '/login?error=google', true);

  const customer = await linkGoogleCustomer(profile);
  if (!customer) return finish(request, '/login?error=google', true);

  await claimGuestOrders(customer.id, customer.email);
  await startCustomerSession(customer.id);
  return finish(request, stored.next, true);
}
