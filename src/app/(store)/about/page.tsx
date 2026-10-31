import { getLocale } from "@/lib/locale";
import { InfoArticle } from "@/components/info-article";
import { infoMetadata } from "@/lib/info";

export const metadata = infoMetadata('about');

export default async function Page() {
  const locale = await getLocale();
  return <InfoArticle slug="about" locale={locale} />;
}
