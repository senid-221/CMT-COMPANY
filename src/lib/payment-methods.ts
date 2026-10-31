export const PAYMENT_METHODS = ['cod', 'card', 'mtn', 'orange', 'wave', 'bank'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ONLINE_PAYMENT_METHODS = ['card', 'mtn', 'orange', 'wave'] as const;
export type OnlinePaymentMethod = (typeof ONLINE_PAYMENT_METHODS)[number];

/** Bank transfer is settled outside the card/MoMo rails, so it is never an online redirect. */
export const MANUAL_PAYMENT_METHODS = ['cod', 'bank'] as const;

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isOnlineMethod(value: unknown): value is OnlinePaymentMethod {
  return typeof value === 'string' && (ONLINE_PAYMENT_METHODS as readonly string[]).includes(value);
}

export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export function paymentStatusValue(value: string): PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value) ? (value as PaymentStatus) : 'unpaid';
}
