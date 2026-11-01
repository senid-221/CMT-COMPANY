import { WhatsAppIcon } from '@/components/icons';
import { t, type Locale } from '@/lib/i18n';

export function WhatsAppFab({ phone, locale }: { phone: string; locale: Locale }) {
  if (!phone) return null;
  const label = t(locale, 'footer.whatsapp');

  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[5.25rem] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg transition hover:bg-whatsapp-dark hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-whatsapp sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-[6.5rem] sm:h-14 sm:w-14"
    >
      <WhatsAppIcon size={26} />
    </a>
  );
}
