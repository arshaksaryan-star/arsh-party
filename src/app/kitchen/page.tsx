import Link from "next/link";
import { redirect } from "next/navigation";
import { kitchenLogout } from "@/app/kitchen/actions";
import { AddTodayItem } from "@/components/kitchen/AddTodayItem";
import { KitchenBoard } from "@/components/kitchen/KitchenBoard";
import { canUseKitchen, isAdmin } from "@/lib/admin-session";
import type { MenuItem } from "@/lib/menu";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import styles from "@/components/kitchen/kitchen.module.css";

export const dynamic = "force-dynamic";

async function loadMenu(): Promise<{ items: MenuItem[]; error: boolean }> {
  if (!isSupabaseConfigured()) return { items: [], error: true };
  try {
    const items = await selectRows<MenuItem>("menu_items", "?select=*&order=category.asc,sort.asc,title.asc", "no-store");
    return { items, error: false };
  } catch (error) {
    console.error("[kitchen] menu", error);
    return { items: [], error: true };
  }
}

/** Экран для кухни: что сегодня есть в дегустационной доставке. Удобен с телефона. */
export default async function KitchenPage() {
  if (!(await canUseKitchen())) redirect("/kitchen/login");
  const [{ items, error }, owner] = await Promise.all([loadMenu(), isAdmin()]);
  const today = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Moscow" });

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <img src="/brand/arsh-party.svg" alt="" width={1280} height={668} className={styles.barLogo} />
          <div className={styles.barText}>
            <b>Сегодня на огне</b>
            <span>{today}</span>
          </div>
          {owner ? (
            <Link href="/admin/menu" className={styles.barLink}>
              Админка
            </Link>
          ) : (
            <form action={kitchenLogout}>
              <button type="submit" className={styles.barLink}>
                Выйти
              </button>
            </form>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {error ? (
          <p className={styles.notice}>Не удалось загрузить меню. Проверьте интернет (и VPN) и обновите страницу.</p>
        ) : (
          <KitchenBoard items={items} />
        )}
        {!error ? <AddTodayItem /> : null}
        <p className={styles.footnote}>
          Нажмите на блюдо, чтобы включить или скрыть его на сайте. Фото, описания и цены постоянных блюд владелец меняет в админке → «Меню
          и цены».
        </p>
      </main>
    </div>
  );
}
