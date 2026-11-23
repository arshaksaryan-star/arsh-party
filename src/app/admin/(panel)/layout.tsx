import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { isAdmin } from "@/lib/admin-session";
import { isSupabaseConfigured } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

/** Всё внутри (panel) доступно только после входа. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={`container ${styles.barInner}`}>
          <img src="/brand/arsh-party.svg" alt="" width={1280} height={668} className={styles.barLogo} />
          <span className={styles.barTitle}>Админка</span>
          <span className={styles.barSpacer} />
          <Link href="/" className={styles.barLink} target="_blank">
            Открыть сайт ↗
          </Link>
          <form action={logout}>
            <button type="submit" className={styles.barButton}>
              Выйти
            </button>
          </form>
        </div>
        <div className="container">
          <AdminTabs />
        </div>
      </header>

      <main className={`container ${styles.main}`}>
        {isSupabaseConfigured() ? null : (
          <p className={styles.notice}>
            База не подключена, поэтому сохранять пока нельзя. Добавьте <code>SUPABASE_URL</code> и{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> в файл <code>.env.local</code> (и в настройки Vercel), выполните{" "}
            <code>supabase/schema.sql</code> в SQL Editor и перезапустите сайт.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
