import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { refCodeCandidates, validateJoin, type AmbassadorRow } from "@/lib/ambassadors";
import { formatPhone } from "@/lib/lead";
import { escapeHtml, isNotifyConfigured, notifyOwner } from "@/lib/notify";
import { insertRow, isSupabaseConfigured, selectRows } from "@/lib/supabase";
import { ambassadorByPhone, hasZvezdaAccess } from "@/lib/zvezda";

/**
 * «Стать амбассадором». Только с тайной страницы.
 * Выдаём личный код для друзей (по возможности — просто имя) и секретную ссылку на кабинет с балансом.
 * Если номер уже в программе — возвращаем тот же кабинет, второй не заводим.
 */
export async function POST(request: Request) {
  if (!(await hasZvezdaAccess())) return NextResponse.json({ error: "Сначала войдите по паролю с визитки." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму. Обновите страницу." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });
  const result = validateJoin(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors, error: "Проверьте поля формы." }, { status: 422 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Программа временно недоступна. Напишите нам." }, { status: 503 });
  const { name, phone, wish } = result.input;

  try {
    const existing = await ambassadorByPhone(phone);
    if (existing) {
      if (existing.status !== "active") return NextResponse.json({ error: "Этот номер не может участвовать. Напишите Аршу." }, { status: 403 });
      return NextResponse.json({ ok: true, code: existing.code, secret: existing.secret, existed: true });
    }

    const candidates = refCodeCandidates(name, wish, (size) => randomBytes(size));
    const taken = new Set(
      (await selectRows<{ code: string }>("ambassadors", `?select=code&code=in.(${candidates.join(",")})`, "no-store")).map((row) => row.code),
    );
    if (wish && taken.has(wish)) return NextResponse.json({ errors: { code: "Этот код уже занят — придумайте другой" }, error: "Код занят." }, { status: 409 });
    const secret = randomBytes(16).toString("hex");
    let row: AmbassadorRow | null = null;
    for (const code of candidates.filter((item) => !taken.has(item))) {
      try {
        row = await insertRow<AmbassadorRow>("ambassadors", { code, secret, name, phone });
        break;
      } catch (error) {
        console.error("[ambassador] insert", error);
      }
    }
    if (!row) return NextResponse.json({ error: "Не получилось. Попробуйте ещё раз или напишите нам." }, { status: 502 });

    if (isNotifyConfigured()) {
      await notifyOwner(`⭐ <b>Новый амбассадор</b>: ${escapeHtml(row.name)}, ${escapeHtml(formatPhone(row.phone))}\nКод для друзей: <b>${row.code}</b>`).catch((error) =>
        console.error("[ambassador] notify", error),
      );
    }
    return NextResponse.json({ ok: true, code: row.code, secret: row.secret, existed: false });
  } catch (error) {
    console.error("[ambassador] join", error);
    return NextResponse.json({ error: "Не получилось. Попробуйте через минуту." }, { status: 502 });
  }
}
