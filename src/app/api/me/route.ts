import { NextResponse } from "next/server";
import { certView, type CertificateRow } from "@/lib/certificates";
import { currentCustomer } from "@/lib/customer-session";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import { ambassadorByPhone, balanceOf } from "@/lib/zvezda";

/** Личный кабинет: кто вошёл, его сертификаты и шашлыкоины (заказы — в /api/my-orders). */
export const dynamic = "force-dynamic";

export async function GET() {
  const phone = await currentCustomer();
  if (!phone) return NextResponse.json({ phone: null }, { headers: { "Cache-Control": "no-store" } });
  if (!isSupabaseConfigured()) return NextResponse.json({ phone, certificates: [], ambassador: null });
  try {
    const [certs, ambassador] = await Promise.all([
      selectRows<CertificateRow>(
        "certificates",
        `?select=code,title,amount,balance,status,expires_at,kind,bonus&buyer_phone=eq.${encodeURIComponent(phone)}&status=neq.cancelled&order=created_at.desc&limit=50`,
        "no-store",
      ),
      ambassadorByPhone(phone),
    ]);
    const active = ambassador && ambassador.status === "active" ? ambassador : null;
    return NextResponse.json(
      {
        phone,
        certificates: certs.map((row) => ({ code: row.code, title: row.title, amount: row.amount, balance: row.balance, view: certView(row), expires_at: row.expires_at })),
        ambassador: active ? { code: active.code, secret: active.secret, balance: await balanceOf(active.id) } : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[me]", error);
    return NextResponse.json({ phone, certificates: [], ambassador: null, error: "unavailable" });
  }
}
