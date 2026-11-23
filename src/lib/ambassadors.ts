/**
 * Амбассадоры Arsh Party и шашлыкоины (владелец, 14.11.2026):
 * 5% от своих заказов и заказов друзей по коду → шашлыкоины (1 коин = 1 ₽ скидки),
 * тратить можно до 30% заказа с мангала и до 50% праздника. Коины не деньги, сгорают через 12 месяцев.
 */
import { normalizePhone } from "@/lib/lead";

export const COIN_EARN_PERCENT = 5;
export const COIN_CAP_MANGAL = 30;
export const COIN_CAP_EVENTS = 50;
export const COIN_TTL_MONTHS = 12;

export type AmbassadorRow = { id: string; code: string; secret: string; name: string; phone: string; status: "active" | "blocked"; created_at: string };
export type CoinRow = {
  id: string;
  ambassador_id: string;
  amount: number;
  reason: "own_order" | "friend_order" | "event" | "spend" | "manual" | "expire";
  order_id: string | null;
  note: string | null;
  expires_at: string | null;
  created_at: string;
};

export const COIN_REASON_LABEL: Record<CoinRow["reason"], string> = {
  own_order: "Ваш заказ",
  friend_order: "Заказ друга по вашему коду",
  event: "Праздник",
  spend: "Оплачено коинами",
  manual: "Начислено Аршем",
  expire: "Сгорели",
};

type LedgerLike = Pick<CoinRow, "amount" | "expires_at"> & { created_at?: string };

/**
 * Учёт шашлыкоинов по правилу «сначала тратятся те, что сгорят раньше».
 * earned — начислено всего, spent — потрачено, expired — сгорело неиспользованными, balance — на руках сейчас.
 * Коины — бонус (кэшбэк шашлыком), не деньги: в чек не пробиваются, но учитываются здесь.
 */
export function coinLedgerSummary(rows: LedgerLike[], now = Date.now()): { earned: number; spent: number; expired: number; balance: number } {
  const sorted = [...rows].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  const grants: { left: number; expires: number }[] = [];
  let earned = 0;
  let spent = 0;
  for (const row of sorted) {
    const at = row.created_at ? Date.parse(row.created_at) : now;
    if (row.amount > 0) {
      earned += row.amount;
      grants.push({ left: row.amount, expires: row.expires_at ? Date.parse(row.expires_at) : Number.POSITIVE_INFINITY });
      continue;
    }
    let need = -row.amount;
    spent += need;
    // Списание берёт из действующих на момент траты начислений, раньше всего — из тех, что скоро сгорят.
    const live = grants.filter((grant) => grant.left > 0 && grant.expires >= at).sort((a, b) => a.expires - b.expires);
    for (const grant of live) {
      if (need === 0) break;
      const take = Math.min(grant.left, need);
      grant.left -= take;
      need -= take;
    }
  }
  let balance = 0;
  let expired = 0;
  for (const grant of grants) {
    if (grant.expires < now) expired += grant.left;
    else balance += grant.left;
  }
  return { earned, spent, expired, balance };
}

/** Баланс на руках сейчас. */
export function coinBalance(rows: LedgerLike[], now = Date.now()): number {
  return coinLedgerSummary(rows, now).balance;
}

export function coinsEarned(paid: number): number {
  return Math.floor((Math.max(0, paid) * COIN_EARN_PERCENT) / 100);
}

export function coinsSpendable(balance: number, orderSum: number, capPercent: number): number {
  return Math.max(0, Math.min(balance, Math.floor((orderSum * capPercent) / 100)));
}

const TRANSLIT: Record<string, string> = {
  а: "A", б: "B", в: "V", г: "G", д: "D", е: "E", ё: "E", ж: "ZH", з: "Z", и: "I", й: "Y", к: "K", л: "L", м: "M", н: "N", о: "O",
  п: "P", р: "R", с: "S", т: "T", у: "U", ф: "F", х: "H", ц: "C", ч: "CH", ш: "SH", щ: "SH", ъ: "", ы: "Y", ь: "", э: "E", ю: "YU", я: "YA",
};
const DIGITS = "23456789";

/** Имя латиницей заглавными: «Иван» → IVAN. */
export function latinName(name: string): string {
  return Array.from(name.trim().split(/\s+/)[0] ?? "")
    .map((char) => TRANSLIT[char.toLowerCase()] ?? (/[a-z0-9]/i.test(char) ? char.toUpperCase() : ""))
    .join("")
    .slice(0, 10);
}

/**
 * Варианты личного кода по порядку — от самого простого: свой код, затем имя (IVAN),
 * имя + цифра (IVAN7), имя + две цифры. Берём первый свободный.
 */
export function refCodeCandidates(name: string, wish: string | null, random: (size: number) => Uint8Array): string[] {
  const out: string[] = [];
  if (wish) out.push(wish);
  const base = latinName(name);
  const stem = base.length >= 3 ? base : "ARSH";
  if (base.length >= 4) out.push(base);
  for (const digit of DIGITS) out.push(`${stem.slice(0, 11)}${digit}`);
  const bytes = random(6);
  for (let i = 0; i < 3; i++) out.push(`${stem.slice(0, 10)}${DIGITS[bytes[i * 2] % 8]}${DIGITS[bytes[i * 2 + 1] % 8]}`);
  return Array.from(new Set(out.filter((code) => /^[A-Z0-9]{4,12}$/.test(code))));
}

export function normalizeRefCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{4,12}$/.test(code) ? code : null;
}

export type JoinInput = { name: string; phone: string; wish: string | null };

export function validateJoin(raw: Record<string, unknown>): { ok: true; input: JoinInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const phone = normalizePhone(typeof raw.phone === "string" ? raw.phone : "");
  if (name.length < 2 || name.length > 80) errors.name = "Как вас зовут?";
  if (!phone) errors.phone = "Номер в формате +7 900 123-45-67";
  const wishRaw = typeof raw.code === "string" ? raw.code.trim() : "";
  const wish = wishRaw ? normalizeRefCode(latinName(wishRaw) || wishRaw) : null;
  if (wishRaw && !wish) errors.code = "От 4 до 12 букв или цифр, например IVAN";
  if (raw.consent !== true) errors.consent = "Нужно согласие с правилами и на обработку данных";
  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };
  return { ok: true, input: { name, phone, wish } };
}
