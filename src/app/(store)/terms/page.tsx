import { getLocale } from "@/lib/locale";
import { InfoArticle } from "@/components/info-article";

export const metadata = { title: "Terms of service" };

export default async function Page() {
  const locale = await getLocale();
  return <InfoArticle slug="terms" locale={locale} />;
}
