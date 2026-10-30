import type { MessageKey } from './i18n';
import { DELIVERY_SLOTS, ORDER_STATUSES, type OrderStatus, type Slot } from './pricing';
import { PAYMENT_METHODS, PAYMENT_STATUSES, type PaymentMethod, type PaymentStatus } from './payment-methods';

const STATUS_LABELS: Record<OrderStatus, MessageKey> = {
  placed: 'order.status.placed',
  packing: 'order.status.packing',
  onWay: 'order.status.onWay',
  delivered: 'order.status.delivered',
  cancelled: 'order.status.cancelled',
};

const SLOT_LABELS: Record<Slot, MessageKey> = {
  express: 'checkout.slot.express',
  today: 'checkout.slot.today',
  morning: 'checkout.slot.morning',
};

const METHOD_LABELS: Record<PaymentMethod, MessageKey> = {
  cod: 'pay.method.cod',
  card: 'pay.method.card',
  mtn: 'pay.method.mtn',
  orange: 'pay.method.orange',
  wave: 'pay.method.wave',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, MessageKey> = {
  unpaid: 'pay.status.unpaid',
  pending: 'pay.status.pending',
  paid: 'pay.status.paid',
  failed: 'pay.status.failed',
};

export function statusKey(status: string): MessageKey {
  const known = (ORDER_STATUSES as readonly string[]).includes(status) ? (status as OrderStatus) : 'placed';
  return STATUS_LABELS[known];
}

export function slotKey(slot: string): MessageKey {
  const known = (DELIVERY_SLOTS as readonly string[]).includes(slot) ? (slot as Slot) : 'today';
  return SLOT_LABELS[known];
}

export function paymentMethodKey(method: string): MessageKey {
  const known = (PAYMENT_METHODS as readonly string[]).includes(method) ? (method as PaymentMethod) : 'cod';
  return METHOD_LABELS[known];
}

export function paymentStatusKey(status: string): MessageKey {
  const known = (PAYMENT_STATUSES as readonly string[]).includes(status) ? (status as PaymentStatus) : 'unpaid';
  return PAYMENT_STATUS_LABELS[known];
}
