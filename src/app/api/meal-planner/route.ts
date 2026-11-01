import { NextResponse } from 'next/server';
import { resolveMarket } from '@/lib/market';
import { clientIp, rateLimited } from '@/lib/rate-limit';
import { buildMealPlan, parseMealPlanInput, PlannerError, plannerConfigured } from '@/lib/meal-planner';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STATUS: Record<PlannerError['code'], number> = {
  unconfigured: 503,
  invalid: 400,
  'too-many': 429,
  timeout: 504,
  failed: 502,
};

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!plannerConfigured()) return fail('unconfigured', STATUS.unconfigured);
  if (rateLimited(`meal-planner:${clientIp(request)}`, 5, 10 * 60_000)) return fail('too-many', STATUS['too-many']);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('invalid', STATUS.invalid);
  }

  const marketCode = body && typeof body === 'object' ? (body as { market?: unknown }).market : undefined;
  const market = resolveMarket(marketCode);
  const input = parseMealPlanInput(body, market);
  if (!input) return fail('invalid', STATUS.invalid);

  try {
    const plan = await buildMealPlan(input);
    return NextResponse.json({ plan }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof PlannerError) return fail(error.code, STATUS[error.code]);
    console.error('[meal-planner] unexpected', error);
    return fail('failed', STATUS.failed);
  }
}
