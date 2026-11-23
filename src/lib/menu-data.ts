import "server-only";
import { MENU_TAG, type MenuItem } from "@/lib/menu";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";

/** Меню на сегодня: только то, что кухня включила. Обновляется сразу после переключения на кухне. */
export async function loadTodayMenu(): Promise<{ items: MenuItem[]; ok: boolean }> {
  if (!isSupabaseConfigured()) return { items: [], ok: false };
  try {
    const items = await selectRows<MenuItem>("menu_items", "?select=*&is_available=eq.true&order=category.asc,sort.asc,title.asc", {
      revalidate: 60,
      tags: [MENU_TAG],
    });
    return { items, ok: true };
  } catch (error) {
    console.error("[menu]", error);
    return { items: [], ok: false };
  }
}
