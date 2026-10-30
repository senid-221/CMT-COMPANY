import { getLocale } from "@/lib/locale";
import { InfoArticle } from "@/components/info-article";

export const metadata = { title: "About CityMarket" };

export default async function Page() {
  const locale = await getLocale();
  return <InfoArticle slug="about" locale={locale} />;
}
