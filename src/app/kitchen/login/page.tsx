import { redirect } from "next/navigation";
import { KitchenLogin } from "@/components/kitchen/KitchenLogin";
import { canUseKitchen } from "@/lib/admin-session";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function KitchenLoginPage() {
  if (await canUseKitchen()) redirect("/kitchen");
  return (
    <div className={styles.loginWrap}>
      <KitchenLogin />
    </div>
  );
}
