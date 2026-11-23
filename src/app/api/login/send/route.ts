import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/lead";
import { clientIp, hashLoginCode, isCustomerLoginReady } from "@/lib/customer-session";
import { deliverCode, isSmsConfigured } from "@/lib/login-delivery";
import { insertRow, isSupabaseConfigured, selectRows } from "@/lib/supabase";

/**
 * Шаг 1 входа: прислать код по SMS. Отправка стоит денег, поэтому ограничения:
 * на номер — раз в 60 секунд и не больше 5 за час; с одного IP — 10 за час; на весь сайт — 300 за сутки.
 */
const PER_PHONE_HOUR = 5;
const PER_IP_HOUR = 10;
const PER_DAY = 300;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму. Обновите страницу." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
  if (!phone) return NextResponse.json({ error: "Номер в формате +7 900 123-45-67" }, { status: 422 });
  if (body.consent !== true) return NextResponse.json({ error: "Нужно согласие на обработку данных" }, { status: 422 });
  if (!isSupabaseConfigured() || !isCustomerLoginReady() || !isSmsConfigured()) {
    return NextResponse.json({ error: "Вход по номеру скоро заработает. Пока заказы видны на устройстве, где вы их сделали." }, { status: 503 });
  }

  const ip = await clientIp();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const [byPhone, byIp, byDay] = await Promise.all([
      selectRows<{ created_at: string }>("login_codes", `?select=created_at&phone=eq.${encodeURIComponent(phone)}&created_at=gte.${hourAgo}&order=created_at.desc`, "no-store"),
      selectRows<{ id: string }>("login_codes", `?select=id&ip=eq.${encodeURIComponent(ip)}&created_at=gte.${hourAgo}`, "no-store"),
      selectRows<{ id: string }>("login_codes", `?select=id&created_at=gte.${dayAgo}&limit=${PER_DAY + 1}`, "no-store"),
    ]);
    const last = byPhone[0] ? Date.parse(byPhone[0].created_at) : 0;
    const wait = Math.ceil((last + 60_000 - Date.now()) / 1000);
    if (wait > 0) return NextResponse.json({ error: `Новый код можно запросить через ${wait} с`, wait }, { status: 429 });
    if (byPhone.length >= PER_PHONE_HOUR || byIp.length >= PER_IP_HOUR) {
      return NextResponse.json({ error: "Слишком много попыток. Попробуйте через час или позвоните нам." }, { status: 429 });
    }
    if (byDay.length >= PER_DAY) {
      console.error("[login] дневной лимит кодов исчерпан");
      return NextResponse.json({ error: "Вход временно недоступен. Попробуйте позже." }, { status: 429 });
    }

    const code = String(randomInt(0, 10000)).padStart(4, "0");
    if (!(await deliverCode(phone, code))) return NextResponse.json({ error: "Не получилось отправить код. Попробуйте ещё раз через минуту." }, { status: 502 });
    await insertRow("login_codes", {
      phone,
      code_hash: hashLoginCode(phone, code),
      channel: "sms",
      ip,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[login] send", error);
    return NextResponse.json({ error: "Не получилось отправить код. Попробуйте через минуту." }, { status: 502 });
  }
}
