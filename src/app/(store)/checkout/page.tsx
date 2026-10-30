import { getLocale } from '@/lib/locale';
import { getCustomer } from '@/lib/customer/auth';
import { googleConfigured } from '@/lib/google';
import { paymentConfig } from '@/lib/payments';
import { CheckoutView } from '@/components/checkout-view';

export const metadata = { title: 'Checkout' };

export default async function CheckoutPage() {
  const locale = await getLocale();
  const customer = await getCustomer();
  return (
    <CheckoutView
      locale={locale}
      googleEnabled={googleConfigured()}
      payments={paymentConfig()}
      customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone ?? '' } : null}
    />
  );
}
