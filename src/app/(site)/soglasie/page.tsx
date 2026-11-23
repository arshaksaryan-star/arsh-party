import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { requisitesFrom } from "@/components/legal/legal";
import { consentItems } from "@/content/legal";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных",
  description: "Текст согласия на обработку персональных данных при отправке заявки или отзыва на сайте Arsh Party.",
};

export default async function ConsentPage() {
  const { site } = await getContent();
  return (
    <LegalPage
      title="Согласие на обработку персональных данных"
      lead="Вы даёте это согласие, когда отмечаете галочку в форме заявки или отзыва."
      sections={[{ id: "consent", title: "Согласие", items: consentItems }]}
      requisites={requisitesFrom(site)}
      related={[
        { href: "/privacy", label: "Политика конфиденциальности" },
        { href: "/rassylka", label: "Согласие на рассылки" },
      ]}
    />
  );
}
