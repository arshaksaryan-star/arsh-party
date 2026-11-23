import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-session";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";

/**
 * Заказы для личного кабинета.
 * Без входа — заказы этого браузера (случайный client_id из localStorage).
 * После входа по коду — все заказы с этого номера телефона плюс заказы этого браузера.
 * Отдаём только состав, сумму, дату и статус — без телефона и адреса.
 */
export const dynamic = "force-dynamic";

type Row = {
  number: number;
  created_at: string;
  items: { id: string; title: string; qty: number; price: number | null }[];
  total: number | null;
  status: string;
};

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("client") ?? "";
  const client = /^[0-9a-f-]{36}$/.test(raw) ? raw : null;
  const phone = await currentCustomer();
  if (!client && !phone) return NextResponse.json({ orders: [], loggedIn: false });
  if (!isSupabaseConfigured()) return NextResponse.json({ orders: [], error: "unavailable" }, { status: 503 });
  const filter = phone
    ? `or=(phone.eq.${encodeURIComponent(phone)}${client ? `,client_id.eq.${client}` : ""})`
    : `client_id=eq.${client}`;
  try {
    const orders = await selectRows<Row>(
      "orders",
      `?select=number,created_at,items,total,status&${filter}&order=created_at.desc&limit=30`,
      "no-store",
    );
    return NextResponse.json({ orders, loggedIn: Boolean(phone) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[my-orders]", error);
    return NextResponse.json({ orders: [], error: "unavailable" }, { status: 502 });
  }
}
