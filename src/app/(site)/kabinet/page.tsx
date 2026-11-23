import type { Metadata } from "next";
import { accentVars, getDirection } from "@/content/directions";
import { MyOrders } from "@/components/mangal/MyOrders";
import { getContent } from "@/lib/content";
import { loadTodayMenu } from "@/lib/menu-data";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false },
};

/** Личный кабинет: вход по номеру, заказы с «Повторить», сертификаты и шашлыкоины. */
export default async function OrdersPage() {
  const [{ directions }, menu] = await Promise.all([getContent(), loadTodayMenu()]);
  const mangal = getDirection("mangal", directions);
  const available = menu.items.map((item) => ({ id: item.id, title: item.title, price: item.price }));
  return (
    <div style={mangal ? (accentVars(mangal.star) as React.CSSProperties) : undefined}>
      <MyOrders available={available} />
    </div>
  );
}
