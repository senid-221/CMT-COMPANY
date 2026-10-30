export const DELIVERY_SLOTS = ['express', 'today', 'morning'] as const;
export type Slot = (typeof DELIVERY_SLOTS)[number];

export const SLOT_FEE_CENTS: Record<Slot, number> = {
  express: 350,
  today: 250,
  morning: 150,
};

export const FREE_DELIVERY_FROM_CENTS = 5000;

export const ORDER_STATUSES = ['placed', 'packing', 'onWay', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isSlot(value: unknown): value is Slot {
  return typeof value === 'string' && (DELIVERY_SLOTS as readonly string[]).includes(value);
}

export function deliveryFeeCents(slot: Slot, subtotalCents: number) {
  if (subtotalCents >= FREE_DELIVERY_FROM_CENTS) return 0;
  return SLOT_FEE_CENTS[slot];
}

export type PriceableLine = { unitPriceCents: number; quantity: number };

export function lineTotalCents(line: PriceableLine) {
  return Math.round(line.unitPriceCents) * Math.round(line.quantity);
}

export function quote(lines: PriceableLine[], slot: Slot) {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
  const fee = subtotalCents >= FREE_DELIVERY_FROM_CENTS ? 0 : SLOT_FEE_CENTS[slot];
  return {
    itemCount: lines.reduce((sum, l) => sum + Math.round(l.quantity), 0),
    subtotalCents,
    deliveryFeeCents: fee,
    totalCents: subtotalCents + fee,
  };
}

export const ORDER_NUMBER_PREFIX = 'CMB';

export function buildOrderNumber(randomDigits: string) {
  const digits = randomDigits.replace(/\D/g, '').padStart(6, '0').slice(-6);
  return `${ORDER_NUMBER_PREFIX}-${digits}`;
}
