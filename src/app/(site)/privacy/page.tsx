import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { requisitesFrom } from "@/components/legal/legal";
import { privacySections } from "@/content/legal";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Как Arsh Party обрабатывает и защищает персональные данные посетителей сайта.",
};

export default async function PrivacyPage() {
  const { site } = await getContent();
  return (
    <LegalPage
      title="Политика конфиденциальности и обработки персональных данных"
      sections={privacySections}
      requisites={requisitesFrom(site)}
      toc
      related={[
        { href: "/soglasie", label: "Согласие на обработку данных" },
        { href: "/rassylka", label: "Согласие на рассылки" },
      ]}
    />
  );
}
