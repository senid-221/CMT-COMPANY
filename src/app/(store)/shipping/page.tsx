import { getLocale } from "@/lib/locale";
import { InfoArticle } from "@/components/info-article";

export const metadata = { title: "Delivery and fees" };

export default async function Page() {
  const locale = await getLocale();
  return <InfoArticle slug="shipping" locale={locale} />;
}
