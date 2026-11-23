import { NextResponse } from "next/server";
import { ambassadorBySecret, balanceOf, isSecret } from "@/lib/zvezda";

/** Баланс шашлыкоинов для корзины: браузер амбассадора помнит секрет своего кабинета. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!isSecret(body.secret)) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const row = await ambassadorBySecret(body.secret);
    if (!row || row.status !== "active") return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ code: row.code, name: row.name, balance: await balanceOf(row.id) });
  } catch (error) {
    console.error("[ambassador] me", error);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
