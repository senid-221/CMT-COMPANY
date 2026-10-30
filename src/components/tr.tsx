import type { Locale } from '@/lib/i18n';
import { t, type MessageKey } from '@/lib/i18n';

export function Tr({ locale, k, vars }: { locale: Locale; k: MessageKey; vars?: Record<string, string | number> }) {
  return <>{t(locale, k, vars)}</>;
}
