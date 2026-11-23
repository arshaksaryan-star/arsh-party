/**
 * Заявка на мероприятие: поля, проверка и нормализация.
 * Один и тот же код работает в браузере (подсказки под полями)
 * и на сервере (окончательная проверка перед сохранением).
 */

import { defaultDirections, type DirectionSlug } from "@/content/directions";

export type ContactVia = "call" | "whatsapp" | "telegram";

export const CONTACT_OPTIONS: readonly { value: ContactVia; label: string }[] = [
  { value: "call", label: "Звонок" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
];

/** Центры регионов ЦФО — подсказки для поля «Город». Можно вписать любой другой. */
export const CFO_CITIES: readonly string[] = [
  "Рязань", "Москва", "Белгород", "Брянск", "Владимир", "Воронеж", "Иваново",
  "Калуга", "Кострома", "Курск", "Липецк", "Орёл", "Смоленск", "Тамбов",
  "Тверь", "Тула", "Ярославль",
];

export type LeadInput = {
  direction: DirectionSlug;
  name: string;
  /** Нормализован к виду +7XXXXXXXXXX. */
  phone: string;
  contactVia: ContactVia;
  city: string;
  /** ГГГГ-ММ-ДД или null. */
  date: string | null;
  guests: number | null;
  comment: string | null;
  clientId: string | null;
};

export type LeadField = "direction" | "name" | "phone" | "contactVia" | "city" | "date" | "guests" | "comment" | "consent";

export type LeadValidation =
  | { ok: true; lead: LeadInput }
  | { ok: false; errors: Partial<Record<LeadField, string>> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** «8 (900) 123-45-67», «+7 900 1234567», «9001234567» → «+79001234567». */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) return `+7${digits}`;
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) return `+7${digits.slice(1)}`;
  return null;
}

/** «+79001234567» → «+7 (900) 123-45-67». */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length !== 11) return phone;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}

/** Сегодняшняя дата в Москве в виде ГГГГ-ММ-ДД. */
export function todayInMoscow(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date());
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateLead(raw: Record<string, unknown>): LeadValidation {
  const errors: Partial<Record<LeadField, string>> = {};

  const direction = text(raw.direction);
  if (!defaultDirections.some((item) => item.slug === direction)) {
    errors.direction = "Выберите направление";
  }

  const name = text(raw.name);
  if (name.length < 2) errors.name = "Как к вам обращаться?";
  else if (name.length > 80) errors.name = "Имя длиннее 80 символов, сократите, пожалуйста";

  const phone = normalizePhone(text(raw.phone));
  if (!phone) errors.phone = "Введите номер, например +7 900 123-45-67";

  const contactVia = text(raw.contactVia) as ContactVia;
  if (!CONTACT_OPTIONS.some((option) => option.value === contactVia)) {
    errors.contactVia = "Выберите способ связи";
  }

  const city = text(raw.city);
  if (city.length < 2) errors.city = "Укажите город";
  else if (city.length > 60) errors.city = "Слишком длинное название города";

  const dateRaw = text(raw.date);
  let date: string | null = null;
  if (dateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) errors.date = "Выберите дату в календаре";
    else if (dateRaw < todayInMoscow()) errors.date = "Эта дата уже прошла";
    else date = dateRaw;
  }

  const guestsRaw = text(String(raw.guests ?? ""));
  let guests: number | null = null;
  if (guestsRaw) {
    const value = Number(guestsRaw);
    if (!Number.isInteger(value) || value < 1 || value > 5000) errors.guests = "Число гостей от 1 до 5000";
    else guests = value;
  }

  const comment = text(raw.comment);
  if (comment.length > 1000) errors.comment = "Комментарий длиннее 1000 символов";

  if (raw.consent !== true && raw.consent !== "on" && raw.consent !== "true") {
    errors.consent = "Без согласия мы не сможем ответить на заявку";
  }

  const clientIdRaw = text(raw.clientId);

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    lead: {
      direction: direction as DirectionSlug,
      name,
      phone: phone as string,
      contactVia,
      city,
      date,
      guests,
      comment: comment || null,
      clientId: UUID.test(clientIdRaw) ? clientIdRaw : null,
    },
  };
}
