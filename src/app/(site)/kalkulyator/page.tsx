import type { Metadata } from "next";
import { PartyCalculator } from "@/components/mangal/PartyCalculator";
import { accentVars } from "@/content/directions";
import { loadTodayMenu } from "@/lib/menu-data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Калькулятор праздника",
  description: "Сколько шашлыка, гарнира, соуса и лаваша нужно на вашу компанию — посчитайте и оформите заказ Arsh Party в одно касание.",
};

/** Отдельная страница калькулятора — удобно отправить ссылкой. */
export default async function CalculatorPage() {
  const menu = await loadTodayMenu();
  return (
    <div className="container" style={{ ...(accentVars("orange") as React.CSSProperties), paddingBlock: "clamp(24px, 5vw, 56px)" }}>
      <PartyCalculator items={menu.items} />
    </div>
  );
}
