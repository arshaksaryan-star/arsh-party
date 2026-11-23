import { NextResponse } from "next/server";
import { normalizeRefCode } from "@/lib/ambassadors";
import { activePerks } from "@/lib/zvezda-shared";
import { ambassadorByCode, loadZvezda } from "@/lib/zvezda";

/** Проверка кода друга в корзине: код действует → плюшки, которые сейчас включены в админке. */
export async function GET(request: Request) {
  const code = normalizeRefCode(new URL(request.url).searchParams.get("code"));
  if (!code) return NextResponse.json({ ok: false });
  try {
    const row = await ambassadorByCode(code);
    if (!row || row.status !== "active") return NextResponse.json({ ok: false });
    const { perks } = await loadZvezda();
    return NextResponse.json({
      ok: true,
      code,
      friend: row.name.split(/\s+/)[0],
      perks: activePerks(perks).map((perk) => ({ title: perk.title, freeDelivery: perk.freeDelivery })),
    });
  } catch (error) {
    console.error("[ambassador] ref", error);
    return NextResponse.json({ ok: false });
  }
}
