import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/lead";
import { hashLoginCode, startCustomerSession } from "@/lib/customer-session";
import { isSupabaseConfigured, selectRows, updateRow } from "@/lib/supabase";

/** Шаг 2 входа: проверить код. 5 попыток на код, код живёт 10 минут и срабатывает один раз. */
const MAX_ATTEMPTS = 5;

type CodeRow = { id: string; code_hash: string; attempts: number; used_at: string | null; expires_at: string };

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму." }, { status: 400 });
  }
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!phone || !/^\d{4}$/.test(code)) return NextResponse.json({ error: "Введите 4 цифры из сообщения" }, { status: 422 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Вход временно недоступен." }, { status: 503 });

  try {
    const [row] = await selectRows<CodeRow>(
      "login_codes",
      `?select=id,code_hash,attempts,used_at,expires_at&phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=1`,
      "no-store",
    );
    if (!row || row.used_at || Date.parse(row.expires_at) < Date.now()) {
      return NextResponse.json({ error: "Код устарел — запросите новый", expired: true }, { status: 410 });
    }
    if (row.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Слишком много попыток — запросите новый код", expired: true }, { status: 429 });
    if (row.code_hash !== hashLoginCode(phone, code)) {
      await updateRow("login_codes", row.id, { attempts: row.attempts + 1 });
      const left = MAX_ATTEMPTS - row.attempts - 1;
      return NextResponse.json({ error: left > 0 ? `Неверный код. Осталось попыток: ${left}` : "Неверный код — запросите новый", expired: left <= 0 }, { status: 401 });
    }
    await updateRow("login_codes", row.id, { used_at: new Date().toISOString(), attempts: row.attempts + 1 });
    await startCustomerSession(phone);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[login] verify", error);
    return NextResponse.json({ error: "Не получилось проверить код. Попробуйте ещё раз." }, { status: 502 });
  }
}
