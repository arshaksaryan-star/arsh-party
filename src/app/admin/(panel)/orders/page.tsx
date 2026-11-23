import { RequestsBoard, type RequestItem } from "@/components/admin/RequestsBoard";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  number: number;
  name: string;
  phone: string;
  address: string;
  deliver_at: string;
  payment: "cash" | "card";
  comment: string | null;
  items: { title: string; qty: number; price: number | null }[];
  total: number | null;
  subtotal: number | null;
  delivery_fee: number | null;
  status: string;
  created_at: string;
};

type LeadRow = {
  id: string;
  number: number;
  direction: string;
  name: string;
  phone: string;
  contact_via: string;
  details: { city?: string; date?: string; guests?: number } | null;
  comment: string | null;
  status: string;
  created_at: string;
};

async function load(): Promise<{ items: RequestItem[]; error: boolean }> {
  if (!isSupabaseConfigured()) return { items: [], error: false };
  try {
    const [orders, leads] = await Promise.all([
      selectRows<OrderRow>("orders", "?select=*&order=created_at.desc&limit=200", "no-store"),
      selectRows<LeadRow>("leads", "?select=*&order=created_at.desc&limit=200", "no-store"),
    ]);
    const items: RequestItem[] = [
      ...orders.map((row) => ({ kind: "order" as const, ...row })),
      ...leads.map((row) => ({ kind: "lead" as const, ...row })),
    ].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { items, error: false };
  } catch (error) {
    console.error("[admin] orders", error);
    return { items: [], error: true };
  }
}

export default async function AdminOrdersPage() {
  const { items, error } = await load();
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Заказы и заявки</h1>
        <p className={styles.pageHint}>
          Все заказы с мангала и заявки с сайта, новые сверху. Уведомления приходят в Telegram и VK, а здесь — полный
          список на случай, если сообщение потерялось. Отмечайте, что взяли в работу и чем закончилось.
        </p>
      </div>
      {error ? <p className={styles.notice}>Не удалось загрузить заказы. Обновите страницу через минуту.</p> : null}
      <RequestsBoard items={items} disabled={!isSupabaseConfigured()} />
    </>
  );
}
