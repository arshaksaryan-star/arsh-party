import { redirect } from "next/navigation";

/** Старый адрес «Мои заказы» → личный кабинет. */
export default function OrdersRedirect() {
  redirect("/kabinet");
}
