import { NextResponse } from 'next/server';
import { getCustomer } from '@/lib/customer/auth';
import { getMarket } from '@/lib/market';
import { getLocale } from '@/lib/locale';
import { clientIp, rateLimited } from '@/lib/rate-limit';
import { ChatError, chatConfigured, parseCart, parseChatInput, runChat } from '@/lib/chat';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LIMIT = 12;
const WINDOW_MS = 5 * 60_000;

export async function POST(request: Request) {
  if (!chatConfigured()) return NextResponse.json({ error: 'unconfigured' }, { status: 503 });

  const ip = clientIp(request);
  if (rateLimited(`chat:${ip}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ error: 'too-many' }, { status: 429 });
  }

  if (Number(request.headers.get('content-length') ?? '0') > 32_000) {
    return NextResponse.json({ error: 'too-large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const input = parseChatInput(body);
  if (!input) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const [customer, market, locale] = await Promise.all([getCustomer(), getMarket(), getLocale()]);
  const cart = parseCart((body as { cart?: unknown }).cart);

  const encoder = new TextEncoder();
  const abort = new AbortController();
  let closed = false;

  const relay = () => abort.abort();
  request.signal.addEventListener('abort', relay, { once: true });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      try {
        await runChat({ market, locale, customer, cart, page: input.page, ip }, input.messages, send, abort.signal);
      } catch (error) {
        if (!abort.signal.aborted) {
          send({ type: 'error', code: error instanceof ChatError ? error.code : 'failed' });
          send({ type: 'done' });
        }
      } finally {
        closed = true;
        request.signal.removeEventListener('abort', relay);
        try {
          controller.close();
        } catch {
          closed = true;
        }
      }
    },
    cancel() {
      closed = true;
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
      connection: 'keep-alive',
    },
  });
}
