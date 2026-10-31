import { getLocale } from '@/lib/locale';
import { getCustomer } from '@/lib/customer/auth';
import { googleConfigured } from '@/lib/google';
import { getMarket } from '@/lib/market';
import { paymentConfig } from '@/lib/payments';
import { CheckoutView } from '@/components/checkout-view';

export const metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage() {
  const [locale, customer, market] = await Promise.all([getLocale(), getCustomer(), getMarket()]);
  return (
    <CheckoutView
      locale={locale}
      market={market}
      googleEnabled={googleConfigured()}
      payments={paymentConfig()}
      customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone ?? '' } : null}
    />
  );
}
