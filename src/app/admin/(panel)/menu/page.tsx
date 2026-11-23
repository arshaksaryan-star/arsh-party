import { MenuManager } from "@/components/admin/MenuManager";
import { PriceImport } from "@/components/admin/PriceImport";
import type { MenuItem } from "@/lib/menu";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

async function loadMenu(): Promise<{ items: MenuItem[]; error: boolean }> {
  if (!isSupabaseConfigured()) return { items: [], error: false };
  try {
    const items = await selectRows<MenuItem>("menu_items", "?select=*&order=category.asc,sort.asc,title.asc", "no-store");
    return { items, error: false };
  } catch (error) {
    console.error("[admin] menu", error);
    return { items: [], error: true };
  }
}

export default async function AdminMenuPage() {
  const { items, error } = await loadMenu();
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Меню и цены</h1>
        <p className={styles.pageHint}>
          Блюда доставки с мангала. Без цены позиция показывается с пометкой «Цена уточняется». Цены можно
          поправить по одной или сразу всем списком из Excel.
        </p>
      </div>
      {error ? (
        <p className={styles.notice}>
          Не удалось загрузить меню из базы. Проверьте, что выполнен <code>supabase/schema.sql</code>.
        </p>
      ) : null}
      <PriceImport disabled={!isSupabaseConfigured()} />
      <MenuManager items={items} disabled={!isSupabaseConfigured()} />
    </>
  );
}
