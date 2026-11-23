import { NextResponse } from "next/server";
import { formatPhone, normalizePhone } from "@/lib/lead";
import { escapeHtml, isNotifyConfigured, notifyOwner } from "@/lib/notify";
import { insertRow, isSupabaseConfigured } from "@/lib/supabase";

/** «Есть дельное предложение о сотрудничестве» → таблица partner_requests и уведомление Аршу. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму. Обновите страницу." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });
  const text = (key: string, max: number) => (typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "");
  const name = text("name", 80);
  const phone = normalizePhone(text("phone", 40));
  const company = text("company", 120) || null;
  const message = text("message", 2000);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Как вас зовут?";
  if (!phone) errors.phone = "Номер в формате +7 900 123-45-67";
  if (message.length < 5) errors.message = "Пара слов о предложении";
  if (body.consent !== true) errors.consent = "Нужно согласие на обработку данных";
  if (Object.keys(errors).length > 0 || !phone) return NextResponse.json({ errors, error: "Проверьте поля формы." }, { status: 422 });

  let saved = false;
  if (isSupabaseConfigured()) {
    try {
      await insertRow("partner_requests", { name, phone, company, message });
      saved = true;
    } catch (error) {
      console.error("[partner] insert", error);
    }
  }
  let notified = false;
  if (isNotifyConfigured()) {
    try {
      await notifyOwner(
        [`🤝 <b>Предложение о сотрудничестве</b>`, `${escapeHtml(name)}, ${escapeHtml(formatPhone(phone))}`, ...(company ? [escapeHtml(company)] : []), "", escapeHtml(message)].join("\n"),
      );
      notified = true;
    } catch (error) {
      console.error("[partner] notify", error);
    }
  }
  if (!saved && !notified) return NextResponse.json({ error: "Не получилось отправить. Позвоните нам." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
