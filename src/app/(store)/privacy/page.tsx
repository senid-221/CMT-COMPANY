import { getLocale } from "@/lib/locale";
import { InfoArticle } from "@/components/info-article";

export const metadata = { title: "Privacy policy" };

export default async function Page() {
  const locale = await getLocale();
  return <InfoArticle slug="privacy" locale={locale} />;
}
