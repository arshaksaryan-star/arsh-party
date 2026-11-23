import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-session";
import { loadRace } from "@/lib/clients-data";
import { quarterLabel, quarterOf } from "@/lib/clients";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadZvezda } from "@/lib/zvezda";

/** «Гонка квартала» для личного кабинета — только если владелец включил её в админке. */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ visible: false });
  const settings = await loadZvezda();
  if (!settings.raceVisible) return NextResponse.json({ visible: false });
  try {
    const phone = await currentCustomer();
    const race = await loadRace(phone);
    return NextResponse.json({ visible: true, quarter: quarterLabel(quarterOf(new Date())), ...race }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[race]", error);
    return NextResponse.json({ visible: false });
  }
}
