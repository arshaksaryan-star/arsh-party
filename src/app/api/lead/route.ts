import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDirection, type Direction } from "@/content/directions";
import { CONTENT_TAG, loadContent } from "@/lib/content";
import { CONTACT_OPTIONS, formatPhone, validateLead, type LeadInput } from "@/lib/lead";
import { insertRow, isSupabaseConfigured, updateRow } from "@/lib/supabase";
import { escapeHtml, isNotifyConfigured, notifyOwner } from "@/lib/notify";

/**
 * Приём заявки на мероприятие.
 * Порядок: проверка → запись в базу (получаем номер) → уведомление в Telegram и VK.
 * Заявка считается принятой, если сработало хотя бы одно из двух.
 */

type LeadRow = { id: string; number: number };

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

function telegramText(lead: LeadInput, number: number | null, directions: Direction[]): string {
  const direction = getDirection(lead.direction, directions);
  const contact = CONTACT_OPTIONS.find((option) => option.value === lead.contactVia)?.label ?? lead.contactVia;
  const lines = [
    `🔥 <b>Новая заявка${number ? ` №${number}` : ""}</b>`,
    `<b>${escapeHtml(direction?.title ?? lead.direction)}</b>`,
    "",
    `Имя: ${escapeHtml(lead.name)}`,
    `Телефон: ${escapeHtml(formatPhone(lead.phone))}`,
    `Связь: ${escapeHtml(contact)}`,
    `Город: ${escapeHtml(lead.city)}`,
  ];
  if (lead.date) lines.push(`Дата: ${formatDate(lead.date)}`);
  if (lead.guests) lines.push(`Гостей: ${lead.guests}`);
  if (lead.comment) lines.push("", `Комментарий: ${escapeHtml(lead.comment)}`);
  return lines.join("\n");
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать заявку. Обновите страницу и попробуйте ещё раз." }, { status: 400 });
  }

  // Скрытое поле-ловушка: человек его не видит, бот заполняет. Отвечаем «ок» и ничего не делаем.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, number: null });
  }

  const result = validateLead(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 422 });
  }
  const lead = result.lead;

  const useDatabase = isSupabaseConfigured();
  const useTelegram = isNotifyConfigured();
  if (!useDatabase && !useTelegram) {
    console.error("[lead] Не настроены ни база, ни уведомления — заявку некуда сохранить");
    return NextResponse.json({ error: "Онлайн-заявки временно не принимаются." }, { status: 503 });
  }

  let saved: LeadRow | null = null;
  if (useDatabase) {
    try {
      saved = await insertRow<LeadRow>("leads", {
        client_id: lead.clientId ?? randomUUID(),
        direction: lead.direction,
        name: lead.name,
        phone: lead.phone,
        contact_via: lead.contactVia,
        details: { city: lead.city, date: lead.date, guests: lead.guests },
        comment: lead.comment,
      });
    } catch (error) {
      console.error("[lead] Supabase:", error);
    }
  }

  let notified = false;
  if (useTelegram) {
    try {
      const { directions } = await loadContent({ revalidate: 300, tags: [CONTENT_TAG] });
      await notifyOwner(telegramText(lead, saved?.number ?? null, directions));
      notified = true;
    } catch (error) {
      console.error("[lead] notify:", error);
    }
  }

  if (saved && notified) {
    await updateRow("leads", saved.id, { telegram_sent: true }).catch((error) => console.error("[lead] Supabase update:", error));
  }

  if (!saved && !notified) {
    return NextResponse.json({ error: "Не получилось отправить заявку." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, number: saved?.number ?? null });
}
