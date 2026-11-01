'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useCartLines } from '@/lib/cart';
import { recordOrder } from '@/lib/local-orders';
import { formatMoney, formatUnits } from '@/lib/money';
import { t, type Locale, type MessageKey } from '@/lib/i18n';
import { paymentMethodKey, slotKey, statusKey } from '@/lib/order-labels';
import type { Currency, Market } from '@/lib/markets';
import type { ChatDraft, ChatEvent, ChatOrder, ChatProduct } from '@/lib/chat-types';
import { AddToCart } from '@/components/add-to-cart';
import { CloseIcon, RefreshIcon, SendIcon, ShieldIcon, SparkleIcon, WhatsAppIcon } from '@/components/icons';

const STORAGE_KEY = 'cmb_chat_v1';
const MAX_STORED = 30;

type DraftState = {
  draft: ChatDraft;
  status: 'pending' | 'placing' | 'placed' | 'failed';
  orderNumber?: string;
  totalCents?: number;
  paymentUrl?: string | null;
  error?: MessageKey;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  activity?: MessageKey;
  products?: ChatProduct[];
  orders?: ChatOrder[];
  draft?: DraftState;
  error?: MessageKey;
};

const TOOL_KEY: Record<string, MessageKey> = {
  search_products: 'chat.tool.search',
  get_order_status: 'chat.tool.order',
  get_my_orders: 'chat.tool.orders',
  prepare_order: 'chat.tool.draft',
};

const ERROR_KEY: Record<string, MessageKey> = {
  unconfigured: 'chat.error.unconfigured',
  'too-many': 'chat.error.tooMany',
  timeout: 'chat.error.timeout',
  busy: 'chat.error.busy',
};

const STATUS_TONE: Record<string, string> = {
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
  onWay: 'bg-info/10 text-info',
  packing: 'bg-warning/10 text-warning',
  placed: 'bg-brand/10 text-brand',
};

const LANGUAGES = [
  { label: 'EN', prompt: 'Hi! I’d like some help shopping.', name: 'English' },
  { label: 'FR', prompt: 'Bonjour ! J’aimerais de l’aide pour mes achats.', name: 'Français' },
  { label: 'RW', prompt: 'Muraho! Ndashaka ubufasha mu guhaha.', name: 'Ikinyarwanda' },
  { label: 'SW', prompt: 'Habari! Nahitaji msaada wa ununuzi.', name: 'Kiswahili' },
];

class ChatFailure extends Error {
  key: MessageKey;
  constructor(key: MessageKey) {
    super('chat-failure');
    this.key = key;
  }
}

function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function errorKey(code: string): MessageKey {
  return ERROR_KEY[code] ?? 'chat.error.failed';
}

function localized(product: ChatProduct, locale: Locale) {
  return locale === 'fr' && product.nameFr ? product.nameFr : product.name;
}

function mergeProducts(existing: ChatProduct[] | undefined, incoming: ChatProduct[]) {
  const merged = [...(existing ?? [])];
  for (const product of incoming) {
    if (!merged.some((item) => item.handle === product.handle)) merged.push(product);
  }
  return merged.slice(0, 8);
}

function mergeOrders(existing: ChatOrder[] | undefined, incoming: ChatOrder[]) {
  const merged = [...(existing ?? [])];
  for (const order of incoming) {
    if (!merged.some((item) => item.number === order.number)) merged.push(order);
  }
  return merged.slice(0, 5);
}

function formatWhen(iso: string, locale: Locale) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"
    >
      {children}
    </button>
  );
}

function ProductMini({ product, locale, market }: { product: ChatProduct; locale: Locale; market: Market }) {
  const name = localized(product, locale);
  return (
    <div className="flex w-[152px] shrink-0 flex-col rounded-xl border border-line bg-canvas p-2">
      <Link href={`/product/${product.handle}`} className="block rounded-lg bg-surface-alt p-1.5">
        <img src={product.image} alt={name} width={120} height={120} loading="lazy" className="mx-auto h-16 w-full object-contain" />
      </Link>
      <Link href={`/product/${product.handle}`} className="mt-1.5 line-clamp-2 min-h-8 text-[12px] font-semibold leading-tight hover:text-brand">
        {name}
      </Link>
      <p className="mt-0.5 truncate text-[10px] text-muted">{product.unit}</p>
      <div className="mt-auto flex items-center justify-between gap-1 pt-1.5">
        <span className="whitespace-nowrap font-display text-[13px] font-bold text-brand">
          {formatMoney(product.priceCents, locale, market)}
        </span>
        <AddToCart handle={product.handle} locale={locale} compact image={product.image} />
      </div>
    </div>
  );
}

function OrderCard({ order, locale, market }: { order: ChatOrder; locale: Locale; market: Market }) {
  return (
    <div className="mt-2 w-full rounded-xl border border-line bg-canvas p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold">{order.number}</p>
          <p className="truncate text-[11px] text-muted">
            {formatWhen(order.placedAt, locale)} · {t(locale, slotKey(order.slot))}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[order.status] ?? 'bg-brand/10 text-brand'}`}>
          {t(locale, statusKey(order.status))}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted">
        {order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="text-[11px] text-muted">{t(locale, 'chat.order.items', { n: order.itemCount })}</span>
        <span className="font-display text-sm font-bold">{formatMoney(order.totalCents, locale, market)}</span>
      </div>
      <Link href={`/order/${order.number}`} className="mt-1.5 inline-flex text-[11px] font-semibold text-brand hover:underline">
        {t(locale, 'chat.order.view')} →
      </Link>
    </div>
  );
}

function DraftRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function DraftCard({
  state,
  locale,
  market,
  onConfirm,
}: {
  state: DraftState;
  locale: Locale;
  market: Market;
  onConfirm: () => void;
}) {
  const { draft } = state;
  const expired = Date.now() > Date.parse(draft.expiresAt);

  if (state.status === 'placed') {
    return (
      <div className="mt-2 w-full rounded-xl border border-success/40 bg-success/10 p-3">
        <p className="font-display text-sm font-bold text-success">✓ {t(locale, 'chat.draft.placed')}</p>
        <p className="mt-0.5 font-display text-lg font-bold">{state.orderNumber}</p>
        <p className="text-xs text-muted">
          {t(locale, 'cart.total')}: {formatMoney(state.totalCents ?? draft.totalCents, locale, market)}
        </p>
        {state.paymentUrl ? (
          <button type="button" onClick={() => window.location.assign(state.paymentUrl!)} className="btn btn-primary btn-3d mt-2.5 w-full">
            {t(locale, 'chat.draft.pay')} ·{' '}
            {formatUnits(state.draft.paymentAmount ?? 0, locale, (state.draft.paymentCurrency ?? 'USD') as Currency)}
          </button>
        ) : null}
        {state.error ? <p className="mt-2 text-[11px] font-semibold text-warning">{t(locale, state.error)}</p> : null}
        <Link href={`/order/${state.orderNumber}`} className="mt-2 inline-flex text-[11px] font-semibold text-brand hover:underline">
          {t(locale, 'chat.order.view')} →
        </Link>
      </div>
    );
  }

  const placing = state.status === 'placing';

  return (
    <div className="mt-2 w-full rounded-xl border-2 border-brand/40 bg-canvas p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-brand">
        <SparkleIcon size={14} />
        <p className="font-display text-sm font-bold">{t(locale, 'chat.draft.title')}</p>
      </div>

      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 text-[11px]">
        {draft.items.map((item) => (
          <li key={item.handle} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">
              {item.qty} × {locale === 'fr' && item.nameFr ? item.nameFr : item.name}
            </span>
            <span className="shrink-0 font-semibold">{formatMoney(item.lineTotalCents, locale, market)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 space-y-0.5 border-t border-line pt-2 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted">{t(locale, 'cart.subtotal')}</span>
          <span>{formatMoney(draft.subtotalCents, locale, market)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">{t(locale, 'cart.delivery')}</span>
          <span>{formatMoney(draft.deliveryFeeCents, locale, market)}</span>
        </div>
        <div className="flex justify-between pt-1 font-display text-sm font-bold">
          <span>{t(locale, 'cart.total')}</span>
          <span className="text-brand">{formatMoney(draft.totalCents, locale, market)}</span>
        </div>
      </div>

      <dl className="mt-2 space-y-0.5 border-t border-line pt-2 text-[11px]">
        <DraftRow label={t(locale, 'checkout.name')} value={draft.customerName} />
        <DraftRow label={t(locale, 'checkout.phone')} value={draft.phone} />
        <DraftRow label={t(locale, 'checkout.address')} value={`${draft.addressLine}, ${draft.city}`} />
        <DraftRow label={t(locale, 'checkout.slot')} value={t(locale, slotKey(draft.slot))} />
        <DraftRow label={t(locale, 'checkout.payment')} value={t(locale, paymentMethodKey(draft.paymentMethod))} />
      </dl>

      {expired ? (
        <p className="mt-2 rounded-lg bg-warning/10 px-2 py-1.5 text-[11px] font-semibold text-warning">{t(locale, 'chat.draft.expired')}</p>
      ) : null}
      {state.error ? (
        <p className="mt-2 rounded-lg bg-danger/10 px-2 py-1.5 text-[11px] font-semibold text-danger">{t(locale, state.error)}</p>
      ) : null}

      <button type="button" onClick={onConfirm} disabled={placing || expired} className="btn btn-primary btn-3d mt-2.5 w-full">
        {placing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            {t(locale, 'chat.draft.placing')}
          </>
        ) : (
          t(locale, 'chat.draft.confirm')
        )}
      </button>
      <p className="mt-1.5 text-center text-[10px] leading-snug text-muted">{t(locale, 'chat.draft.note')}</p>
      {draft.paymentMethod === 'card' || draft.paymentMethod === 'mtn' || draft.paymentMethod === 'orange' || draft.paymentMethod === 'wave' ? (
        <p className="mt-0.5 text-center text-[10px] leading-snug text-muted">{t(locale, 'chat.draft.paymentLater')}</p>
      ) : null}
    </div>
  );
}

export function ChatWidget({
  locale,
  market,
  customer,
  available,
  whatsapp,
}: {
  locale: Locale;
  market: Market;
  customer: { name: string; phone: string | null } | null;
  available: boolean;
  whatsapp: string;
}) {
  const cart = useCartLines();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const openRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const firstName = customer?.name?.trim().split(/\s+/)[0];
  const greeting = firstName ? t(locale, 'chat.greetingNamed', { name: firstName }) : t(locale, 'chat.greeting');

  function commit(updater: (prev: Message[]) => Message[]) {
    setMessages((prev) => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  }

  function updateMessage(id: string, patch: (message: Message) => Message) {
    commit((prev) => prev.map((message) => (message.id === id ? patch(message) : message)));
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { messages?: unknown };
        if (Array.isArray(parsed?.messages)) {
          const restored = parsed.messages
            .filter((message): message is Message => {
              const value = message as Partial<Message>;
              return Boolean(value && (value.role === 'user' || value.role === 'assistant') && typeof value.text === 'string' && typeof value.id === 'string');
            })
            .slice(-MAX_STORED)
            .map((message) => ({
              ...message,
              activity: undefined,
              error: undefined,
              draft: message.draft
                ? { ...message.draft, status: message.draft.status === 'placing' ? 'pending' : message.draft.status }
                : undefined,
            }));
          messagesRef.current = restored;
          setMessages(restored);
        }
      }
    } catch {
      // Corrupt or blocked storage starts a fresh conversation.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || busy) return;
    try {
      const slim = messages.slice(-MAX_STORED).map((message) => ({
        id: message.id,
        role: message.role,
        text: message.text.slice(0, 8000),
        products: message.products?.slice(0, 8),
        orders: message.orders?.slice(0, 5),
        draft: message.draft
          ? {
              draft: message.draft.draft,
              status: message.draft.status === 'placing' ? 'pending' : message.draft.status,
              orderNumber: message.draft.orderNumber,
              totalCents: message.draft.totalCents,
              paymentUrl: message.draft.paymentUrl,
            }
          : undefined,
      }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, messages: slim }));
    } catch {
      // Storage quota or privacy mode: chat keeps working without persistence.
    }
  }, [messages, loaded, busy]);

  useEffect(() => {
    openRef.current = open;
    if (open) setUnread(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(96, field.scrollHeight)}px`;
  }, [input]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function stop() {
    abortRef.current?.abort();
  }

  function newChat() {
    abortRef.current?.abort();
    messagesRef.current = [];
    setMessages([]);
    setInput('');
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage may be blocked; the in-memory conversation is already cleared.
    }
  }

  async function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || busy || !available) return;
    if (raw === undefined) setInput('');

    const user: Message = { id: uid(), role: 'user', text };
    const assistantId = uid();
    const assistant: Message = { id: assistantId, role: 'assistant', text: '', activity: 'chat.typing' };
    const history = [...messagesRef.current, user]
      .slice(-16)
      .map((message) => ({ role: message.role, content: message.text }))
      .filter((message) => message.content.trim().length > 0);

    commit((prev) => [...prev, user, assistant]);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let buffer = '';
    let frame = 0;
    let finished = false;
    let errored = false;
    let produced = false;

    const flush = () => {
      frame = 0;
      if (!buffer) return;
      const chunk = buffer;
      buffer = '';
      updateMessage(assistantId, (message) => ({ ...message, text: message.text + chunk }));
    };
    const push = (chunk: string) => {
      produced = true;
      buffer += chunk;
      if (!frame) frame = window.requestAnimationFrame(flush);
    };
    const drain = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      flush();
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history, cart, page: window.location.pathname }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new ChatFailure(errorKey(String(data?.error ?? (response.status === 429 ? 'too-many' : 'failed'))));
      }
      if (!response.body) throw new ChatFailure('chat.error.failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      let closed = false;

      while (!closed) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        let cut = pending.indexOf('\n\n');
        while (cut >= 0) {
          const block = pending.slice(0, cut);
          pending = pending.slice(cut + 2);
          cut = pending.indexOf('\n\n');
          const line = block.split('\n').find((row) => row.startsWith('data:'));
          if (!line) continue;
          let event: ChatEvent;
          try {
            event = JSON.parse(line.slice(5).trim()) as ChatEvent;
          } catch {
            continue;
          }
          if (event.type === 'delta') {
            push(event.text);
          } else if (event.type === 'tool') {
            updateMessage(assistantId, (message) => ({ ...message, activity: TOOL_KEY[event.name] ?? 'chat.tool.generic' }));
          } else if (event.type === 'products') {
            produced = true;
            updateMessage(assistantId, (message) => ({
              ...message,
              products: mergeProducts(message.products, event.products),
              activity: 'chat.typing',
            }));
          } else if (event.type === 'orders') {
            produced = true;
            updateMessage(assistantId, (message) => ({ ...message, orders: mergeOrders(message.orders, event.orders) }));
          } else if (event.type === 'draft') {
            produced = true;
            updateMessage(assistantId, (message) => ({ ...message, draft: { draft: event.draft, status: 'pending' } }));
          } else if (event.type === 'error') {
            drain();
            errored = true;
            updateMessage(assistantId, (message) => ({ ...message, activity: undefined, error: errorKey(event.code) }));
            closed = true;
          } else if (event.type === 'done') {
            finished = true;
            closed = true;
          }
        }
      }

      drain();
      updateMessage(assistantId, (message) => ({ ...message, activity: undefined }));
      if (!finished && !errored) throw new ChatFailure('chat.error.failed');
    } catch (error) {
      drain();
      if ((error as Error).name === 'AbortError') {
        updateMessage(assistantId, (message) => (produced ? { ...message, activity: undefined } : message));
        if (!produced) commit((prev) => prev.filter((message) => message.id !== assistantId));
      } else {
        const key = error instanceof ChatFailure ? error.key : 'chat.error.failed';
        updateMessage(assistantId, (message) => ({ ...message, activity: undefined, error: key }));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      if (!openRef.current && produced) setUnread(true);
    }
  }

  async function confirmDraft(messageId: string, state: DraftState) {
    if (state.status === 'placing' || state.status === 'placed') return;
    updateMessage(messageId, (message) =>
      message.draft ? { ...message, draft: { ...message.draft, status: 'placing', error: undefined } } : message,
    );
    try {
      const response = await fetch('/api/chat/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: state.draft.token }),
      });
      const data = (await response.json().catch(() => null)) as {
        number?: string;
        totalCents?: number;
        paymentUrl?: string | null;
        paymentError?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !data?.number) {
        const code = String(data?.error ?? 'failed');
        const key: MessageKey =
          code === 'expired'
            ? 'chat.draft.expired'
            : code === 'duplicate'
              ? 'chat.draft.duplicate'
              : code === 'market-changed'
                ? 'chat.draft.marketChanged'
                : code === 'stale-cart'
                  ? 'chat.draft.stale'
                  : 'chat.draft.failed';
        throw new ChatFailure(key);
      }

      recordOrder({ number: data.number, phone: state.draft.phone, placedAt: new Date().toISOString() });
      updateMessage(messageId, (message) =>
        message.draft
          ? {
              ...message,
              draft: {
                ...message.draft,
                status: 'placed',
                orderNumber: data.number,
                totalCents: Number(data.totalCents ?? message.draft.draft.totalCents),
                paymentUrl: typeof data.paymentUrl === 'string' ? data.paymentUrl : null,
                error: data.paymentError ? 'chat.draft.paymentFailed' : undefined,
              },
            }
          : message,
      );
    } catch (error) {
      const key = error instanceof ChatFailure ? error.key : 'chat.draft.failed';
      updateMessage(messageId, (message) =>
        message.draft ? { ...message, draft: { ...message.draft, status: 'failed', error: key } } : message,
      );
    }
  }

  const quick = [
    { key: 'chat.quick.order' as MessageKey, prompt: locale === 'fr' ? 'Où est ma commande ?' : 'Where is my order?' },
    { key: 'chat.quick.dinner' as MessageKey, prompt: locale === 'fr' ? 'Que me conseilles-tu pour le dîner ?' : 'What do you recommend for dinner?' },
    { key: 'chat.quick.delivery' as MessageKey, prompt: locale === 'fr' ? 'Livrez-vous aujourd’hui ?' : 'Do you deliver today?' },
    { key: 'chat.quick.help' as MessageKey, prompt: locale === 'fr' ? 'Aide-moi à passer une commande.' : 'Help me place an order.' },
  ];

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t(locale, 'chat.open')}
          title={t(locale, 'chat.open')}
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-brand-solid)] text-white shadow-lg transition hover:scale-105 hover:bg-[var(--color-brand-solid-hover)] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6 sm:h-16 sm:w-16"
        >
          <span className="absolute inset-0 rounded-full bg-brand/40 blur-lg" aria-hidden />
          <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-[var(--color-brand-solid)] bg-lime" aria-hidden />
          <span className="relative">
            <SparkleIcon size={26} />
          </span>
          {unread ? (
            <span className="absolute -left-0.5 top-0 h-3.5 w-3.5 rounded-full bg-danger ring-2 ring-canvas" aria-hidden />
          ) : null}
        </button>
      ) : null}

      {open ? (
        <section
          role="dialog"
          aria-label={t(locale, 'chat.title')}
          className="anim-rise fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 flex h-[min(82dvh,720px)] flex-col overflow-hidden rounded-3xl border border-line bg-canvas shadow-xl sm:inset-x-auto sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6 sm:h-[min(680px,calc(100dvh-3rem))] sm:w-[400px]"
        >
          <header className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#1f5a45,#297357)] px-4 pb-3 pt-3 text-white">
            <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-lime/20 blur-2xl" aria-hidden />
            <div className="relative flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
                <SparkleIcon size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-bold leading-tight">{t(locale, 'chat.title')}</p>
                <p className="flex items-center gap-1.5 text-[11px] leading-tight text-white/90">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${available ? 'bg-lime' : 'bg-white/50'}`} aria-hidden />
                  {available ? t(locale, 'chat.subtitle') : t(locale, 'chat.offline')}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <IconButton label={t(locale, 'chat.newChat')} onClick={newChat}>
                  <RefreshIcon size={17} />
                </IconButton>
                <IconButton label={t(locale, 'chat.close')} onClick={() => setOpen(false)}>
                  <CloseIcon size={18} />
                </IconButton>
              </div>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-surface-alt/40 px-3 py-4">
            {!available ? (
              <div className="anim-fade space-y-3 rounded-2xl border border-line bg-canvas p-4">
                <p className="font-display text-sm font-bold">{t(locale, 'chat.offline')}</p>
                <p className="text-sm leading-relaxed text-muted">{t(locale, 'chat.offlineHint')}</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/shop" className="btn btn-primary btn-3d px-4 py-2 text-sm">
                    {t(locale, 'home.shopNow')}
                  </Link>
                  {whatsapp ? (
                    <a
                      href={`https://wa.me/${whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-3d btn-3d-line px-4 py-2 text-sm"
                    >
                      <WhatsAppIcon size={16} />
                      {t(locale, 'chat.human')}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="anim-fade space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#297357,#82cc15)] text-white shadow-sm">
                    <SparkleIcon size={22} />
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold leading-snug">{greeting}</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-muted">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                      {t(locale, 'chat.subtitle')}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted">{t(locale, 'chat.intro')}</p>
                <p className="text-[11px] leading-snug text-muted">{t(locale, 'chat.languages')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.label}
                      type="button"
                      onClick={() => void send(language.prompt)}
                      title={language.name}
                      className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-bold transition hover:border-brand hover:text-brand"
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {quick.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => void send(item.prompt)}
                      className="rounded-xl border border-line bg-canvas p-2.5 text-left text-[12px] font-medium leading-snug transition hover:border-brand hover:bg-brand/5 hover:text-brand"
                    >
                      {t(locale, item.key)}
                    </button>
                  ))}
                </div>
                {whatsapp ? (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand hover:underline"
                  >
                    <WhatsAppIcon size={13} />
                    {t(locale, 'chat.human')}
                  </a>
                ) : null}
              </div>
            ) : (
              messages.map((message) => {
                if (message.role === 'user') {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[var(--color-brand-solid)] px-3 py-2 text-[13px] leading-relaxed text-white shadow-sm">
                        {message.text}
                      </div>
                    </div>
                  );
                }

                const waiting = !message.text && !message.error && (Boolean(message.activity) || (!message.products?.length && !message.orders?.length && !message.draft));

                return (
                  <div key={message.id} className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                      <SparkleIcon size={14} />
                    </span>
                    <div className="min-w-0 max-w-[88%] space-y-1.5">
                      <div className="rounded-2xl rounded-tl-md border border-line bg-canvas px-3 py-2 text-[13px] leading-relaxed text-ink shadow-sm">
                        {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
                        {waiting ? (
                          <div className="flex items-center gap-2 py-0.5 text-[11px] font-medium text-muted">
                            <span className="flex items-center gap-1" aria-hidden>
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
                            </span>
                            {t(locale, message.activity ?? 'chat.typing')}
                          </div>
                        ) : null}
                        {message.error ? (
                          <p className={`mt-1 text-[12px] font-semibold text-danger ${message.text ? 'border-t border-line pt-1.5' : ''}`}>
                            {t(locale, message.error)}
                          </p>
                        ) : null}
                      </div>

                      {message.products?.length ? (
                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar">
                          {message.products.map((product) => (
                            <ProductMini key={product.handle} product={product} locale={locale} market={market} />
                          ))}
                        </div>
                      ) : null}

                      {message.orders?.map((order) => (
                        <OrderCard key={order.number} order={order} locale={locale} market={market} />
                      ))}

                      {message.draft ? (
                        <DraftCard
                          state={message.draft}
                          locale={locale}
                          market={market}
                          onConfirm={() => void confirmDraft(message.id, message.draft!)}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="shrink-0 border-t border-line bg-canvas p-2.5"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface-alt py-1.5 pl-3 pr-1.5 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 1000))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                maxLength={1000}
                disabled={!available}
                placeholder={t(locale, 'chat.placeholder')}
                aria-label={t(locale, 'chat.placeholder')}
                className="max-h-24 min-h-6 flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-5 text-ink outline-none placeholder:text-muted disabled:opacity-60"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label={t(locale, 'chat.stop')}
                  title={t(locale, 'chat.stop')}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-action text-action-fg transition active:scale-90"
                >
                  <span className="block h-3 w-3 rounded-[2px] bg-current" aria-hidden />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!available || !input.trim()}
                  aria-label={t(locale, 'chat.send')}
                  title={t(locale, 'chat.send')}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand-solid)] text-white transition hover:bg-[var(--color-brand-solid-hover)] active:scale-90 disabled:opacity-40"
                >
                  <SendIcon size={17} />
                </button>
              )}
            </div>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-[9px] font-medium text-muted">
              <ShieldIcon size={10} />
              {t(locale, 'chat.privacy')}
            </p>
          </form>
        </section>
      ) : null}
    </>
  );
}
