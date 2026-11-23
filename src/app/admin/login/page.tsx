import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { isAdmin } from "@/lib/admin-session";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className={styles.loginWrap}>
      <LoginForm />
    </div>
  );
}
