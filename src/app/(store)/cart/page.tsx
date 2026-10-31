import { getLocale } from '@/lib/locale';
import { getMarket } from '@/lib/market';
import { CartView } from '@/components/cart-view';

export const metadata = { title: 'Cart' };

export default async function CartPage() {
  const [locale, market] = await Promise.all([getLocale(), getMarket()]);
  return <CartView locale={locale} market={market} />;
}
