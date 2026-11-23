import { isAdmin } from "@/lib/admin-session";
import { categoryLabel } from "@/lib/menu";
import { toPriceCsv } from "@/lib/price-table";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";

/** «Скачать прайс»: текущее меню в CSV для Excel — поправить цены и загрузить обратно. */
export async function GET() {
  if (!(await isAdmin())) return new Response("Нужно войти в админку", { status: 401 });
  if (!isSupabaseConfigured()) return new Response("База не подключена", { status: 503 });
  const items = await selectRows<{ id: string; category: string; title: string; weight: string | null; price: number | null }>(
    "menu_items",
    "?select=id,category,title,weight,price&order=category.asc,sort.asc,title.asc",
    "no-store",
  );
  return new Response(toPriceCsv(items, categoryLabel), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="arsh-party-prices.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
