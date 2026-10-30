import { getLocale } from '@/lib/locale';
import { CartView } from '@/components/cart-view';

export const metadata = { title: 'Cart' };

export default async function CartPage() {
  const locale = await getLocale();
  return <CartView locale={locale} />;
}
