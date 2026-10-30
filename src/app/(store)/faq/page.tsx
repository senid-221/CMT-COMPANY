import { getLocale } from "@/lib/locale";
import { InfoArticle } from "@/components/info-article";

export const metadata = { title: "Frequently asked questions" };

export default async function Page() {
  const locale = await getLocale();
  return <InfoArticle slug="faq" locale={locale} />;
}
