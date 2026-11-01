export type ChatRole = 'user' | 'assistant';

export type ChatMessage = { role: ChatRole; content: string };

export type ChatProduct = {
  handle: string;
  name: string;
  nameFr: string | null;
  unit: string;
  image: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  category: string;
  categoryFr: string | null;
  rating: number | null;
  ratingCount: number;
};

export type ChatOrderItem = { name: string; quantity: number };

export type ChatOrder = {
  number: string;
  status: string;
  placedAt: string;
  slot: string;
  totalCents: number;
  itemCount: number;
  paymentMethod: string;
  paymentStatus: string;
  items: ChatOrderItem[];
  city: string;
};

export type ChatDraftItem = {
  handle: string;
  name: string;
  nameFr: string | null;
  unit: string;
  image: string;
  qty: number;
  priceCents: number;
  lineTotalCents: number;
};

export type ChatDraft = {
  token: string;
  expiresAt: string;
  items: ChatDraftItem[];
  customerName: string;
  phone: string;
  addressLine: string;
  city: string;
  slot: string;
  paymentMethod: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
  paymentCurrency: string | null;
  paymentAmount: number | null;
};

export type ChatEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'products'; products: ChatProduct[] }
  | { type: 'orders'; orders: ChatOrder[] }
  | { type: 'draft'; draft: ChatDraft }
  | { type: 'error'; code: string }
  | { type: 'done' };
