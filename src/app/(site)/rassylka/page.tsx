import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { requisitesFrom } from "@/components/legal/legal";
import { mailingItems } from "@/content/legal";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Согласие на получение рассылок",
  description: "Условия получения новостей и специальных предложений Arsh Party.",
};

export default async function MailingPage() {
  const { site } = await getContent();
  return (
    <LegalPage
      title="Согласие на получение рассылок"
      sections={[{ id: "mailing", title: "Согласие", items: mailingItems }]}
      requisites={requisitesFrom(site)}
      related={[
        { href: "/privacy", label: "Политика конфиденциальности" },
        { href: "/soglasie", label: "Согласие на обработку данных" },
      ]}
    />
  );
}
