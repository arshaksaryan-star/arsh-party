import "server-only";
import { clientStats, type ClientOrder, type ClientRow, type ClientStats } from "@/lib/clients";
import { insertRow, selectRows } from "@/lib/supabase";

type SiteOrder = { id: string; number: number; name: string; phone: string; total: number | null; subtotal: number | null; items: { title: string }[]; created_at: string; status: string };
type StoredOrder = { id: string; client_id: string; order_date: string; amount: number; stars: string[] | null; note: string | null; source: "manual" | "import"; verified: boolean };

export type ClientWithStats = ClientRow & { stats: ClientStats; orders: ClientOrder[] };

function moscowDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date(iso));
}

/**
 * Все клиенты с заказами: внесённые вручную/из переписки + выполненные заказы с сайта (по телефону).
 * Покупатель с сайта, которого ещё нет в списке, добавляется сам — номер AP-… ему выдаёт база.
 */
export async function loadClients(options: { autoCreate?: boolean } = {}): Promise<ClientWithStats[]> {
  const autoCreate = options.autoCreate ?? true;
  const [clients, stored, site] = await Promise.all([
    selectRows<ClientRow>("clients", "?select=*&order=num.asc&limit=5000", "no-store"),
    selectRows<StoredOrder>("client_orders", "?select=*&order=order_date.desc&limit=20000", "no-store"),
    selectRows<SiteOrder>("orders", "?select=id,number,name,phone,total,subtotal,items,created_at,status&status=eq.done&order=created_at.desc&limit=20000", "no-store"),
  ]);

  const byPhone = new Map(clients.filter((client) => client.phone).map((client) => [client.phone as string, client]));
  for (const order of site) {
    if (byPhone.has(order.phone) || !autoCreate) continue;
    try {
      const created = await insertRow<ClientRow>("clients", { name: order.name.slice(0, 80), phone: order.phone, source: "сайт" });
      clients.push(created);
      byPhone.set(order.phone, created);
    } catch (error) {
      console.error("[clients] auto-create", error);
    }
  }

  const ordersBy = new Map<string, ClientOrder[]>();
  const push = (clientId: string, order: ClientOrder) => ordersBy.set(clientId, [...(ordersBy.get(clientId) ?? []), order]);
  for (const order of stored) {
    push(order.client_id, {
      id: order.id,
      client_id: order.client_id,
      date: order.order_date,
      amount: order.amount,
      stars: order.stars ?? [],
      note: order.note,
      source: order.source,
      verified: order.verified,
    });
  }
  for (const order of site) {
    const client = byPhone.get(order.phone);
    if (!client) continue;
    push(client.id, {
      id: `site-${order.id}`,
      client_id: client.id,
      date: moscowDate(order.created_at),
      amount: order.total ?? order.subtotal ?? 0,
      stars: ["mangal"],
      note: `Заказ с сайта №${order.number}`,
      source: "site",
      verified: true,
    });
  }

  const now = new Date();
  return clients.map((client) => {
    const orders = (ordersBy.get(client.id) ?? []).sort((a, b) => b.date.localeCompare(a.date));
    return { ...client, orders, stats: clientStats(client, orders, now) };
  });
}

export type RaceEntry = { place: number; name: string; you: boolean };

/**
 * Гонка квартала для личного кабинета: места 1–50, только имя и 4 последние цифры номера.
 * Суммы других клиентов не показываем; вошедшему — его сумму и сколько не хватает до 50-го места.
 */
export async function loadRace(phone: string | null): Promise<{ entries: RaceEntry[]; mine: { place: number | null; amount: number; gap: number | null } | null }> {
  const { maskedName, RACE_SIZE } = await import("@/lib/clients");
  const clients = (await loadClients({ autoCreate: false })).filter((client) => client.stats.quarter > 0).sort((a, b) => b.stats.quarter - a.stats.quarter);
  const entries = clients.slice(0, RACE_SIZE).map((client, index) => ({ place: index + 1, name: maskedName(client.name, client.phone), you: Boolean(phone && client.phone === phone) }));
  if (!phone) return { entries, mine: null };
  const index = clients.findIndex((client) => client.phone === phone);
  const amount = index >= 0 ? clients[index].stats.quarter : 0;
  const last = clients[RACE_SIZE - 1]?.stats.quarter ?? 0;
  const inside = index >= 0 && index < RACE_SIZE;
  return { entries, mine: { place: index >= 0 ? index + 1 : null, amount, gap: inside || clients.length < RACE_SIZE ? null : Math.max(0, last - amount + 1) } };
}
