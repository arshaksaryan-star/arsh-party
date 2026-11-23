/**
 * Подарочные сертификаты: виды, проверка формы покупки, код, статусы.
 * Один код для страницы /podarok, API и админки.
 */
import { normalizePhone } from "@/lib/lead";

export const CERT_VALID_MONTHS = 12;
export const CERT_MIN_CUSTOM = 3000;
export const CERT_MAX_CUSTOM = 300000;

export type CertKind = "delivery" | "party" | "host" | "catering" | "custom" | "kopilka";

export type CertOffer = {
  kind: CertKind;
  title: string;
  subtitle: string;
  /** null — сумму выбирает покупатель. */
  amount: number | null;
  star: "orange" | "red" | "green" | "pink" | "blue";
};

/** Номиналы — от владельца (14.11.2026). */
export const CERT_OFFERS: readonly CertOffer[] = [
  { kind: "delivery", title: "Не хочу готовить", subtitle: "Доставка горячего с мангала", amount: 3000, star: "orange" },
  { kind: "party", title: "Девичник · мальчишник · шашлышник", subtitle: "Праздник с шашлыком для своих", amount: 10000, star: "red" },
  { kind: "host", title: "Ведущий на памятное событие", subtitle: "Арш ведёт ваш вечер", amount: 50000, star: "blue" },
  { kind: "catering", title: "Кейтеринг", subtitle: "Фуршет или банкет под ваш праздник", amount: 100000, star: "green" },
  { kind: "custom", title: "Поддержать малый бизнес", subtitle: "Своя сумма — и приходите к нам на шашлык", amount: null, star: "pink" },
];

/**
 * «Копилка» — только на тайной странице /zvezda. Пока сертификат не тратят, каждый полный месяц
 * к нему добавляется бонус услугами: +3% от номинала, не дольше 6 месяцев (владелец, 14.11.2026).
 * Бонус — только услугами, деньгами не выдаётся; при возврате сгорает.
 */
export const KOPILKA = { percent: 3, maxMonths: 6, min: 5000, max: 300000 } as const;

export const KOPILKA_OFFER: CertOffer = {
  kind: "kopilka",
  title: "Копилка",
  subtitle: `+${KOPILKA.percent}% услугами за каждый месяц ожидания, до ${KOPILKA.maxMonths} месяцев`,
  amount: null,
  star: "orange",
};

export function offerFor(kind: string): CertOffer | undefined {
  if (kind === "kopilka") return KOPILKA_OFFER;
  return CERT_OFFERS.find((offer) => offer.kind === kind);
}

/** Полных месяцев между датами (по календарю). */
export function fullMonths(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

type Growable = Pick<CertificateRow, "status" | "amount" | "paid_at"> & {
  growth_percent?: number | string | null;
  growth_max_months?: number | null;
  growth_stopped_at?: string | null;
};

/** Сколько «наросло» на копилке сейчас (ещё не зафиксировано). 0 — не копилка или рост остановлен. */
export function certGrowth(row: Growable, now = new Date()): { months: number; bonus: number } {
  const percent = Number(row.growth_percent ?? 0);
  if (!percent || row.growth_stopped_at || row.status !== "paid" || !row.paid_at) return { months: 0, bonus: 0 };
  const months = Math.min(fullMonths(new Date(row.paid_at), now), row.growth_max_months ?? KOPILKA.maxMonths);
  return { months, bonus: Math.round((row.amount * percent * months) / 100) };
}

export type CertStatus = "pending" | "paid" | "used" | "refunded" | "cancelled";

export type CertificateRow = {
  id: string;
  code: string;
  kind: CertKind;
  title: string;
  amount: number;
  balance: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  recipient_name: string | null;
  message: string | null;
  status: CertStatus;
  payment_id: string | null;
  receipt_via?: ReceiptVia | null;
  growth_percent?: number | string | null;
  growth_max_months?: number | null;
  bonus?: number;
  growth_stopped_at?: string | null;
  paid_via: "online" | "manual" | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
};

/** Для показа: «истёк» считаем по дате, в базе статус не меняем. */
export type CertView = CertStatus | "expired";

export function certView(row: Pick<CertificateRow, "status" | "expires_at" | "balance">, now = Date.now()): CertView {
  if (row.status === "paid" && row.expires_at && Date.parse(row.expires_at) < now) return "expired";
  return row.status;
}

export const CERT_VIEW_LABEL: Record<CertView, string> = {
  pending: "Ждёт оплаты",
  paid: "Действует",
  used: "Погашен",
  expired: "Срок истёк",
  refunded: "Возврат",
  cancelled: "Отменён",
};

/** Код без похожих символов (нет 0/O, 1/I/L): ARSH-7K2M-Q9WD. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function makeCertCode(random: (size: number) => Uint8Array): string {
  const bytes = random(8);
  const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
  return `ARSH-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function normalizeCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = clean.startsWith("ARSH") ? clean.slice(4) : clean;
  return body.length === 8 ? `ARSH-${body.slice(0, 4)}-${body.slice(4)}` : raw.trim().toUpperCase();
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export type CertInput = {
  kind: CertKind;
  amount: number;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  recipientName: string | null;
  message: string | null;
  /** Куда прислать кассовый чек: на e-mail или SMS на номер покупателя. */
  receiptVia: ReceiptVia;
  consent: true;
};

export type ReceiptVia = "email" | "sms";

export type CertField = "kind" | "amount" | "buyerName" | "buyerPhone" | "buyerEmail" | "recipientName" | "message" | "receiptVia" | "consent";
export type CertErrors = Partial<Record<CertField, string>>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateCertificate(raw: Record<string, unknown>): { ok: true; input: CertInput } | { ok: false; errors: CertErrors } {
  const errors: CertErrors = {};
  const offer = offerFor(text(raw.kind));
  if (!offer) errors.kind = "Выберите сертификат";

  let amount = offer?.amount ?? Math.round(Number(String(raw.amount ?? "").replace(/\s/g, "")));
  if (offer && offer.amount === null) {
    const min = offer.kind === "kopilka" ? KOPILKA.min : CERT_MIN_CUSTOM;
    const max = offer.kind === "kopilka" ? KOPILKA.max : CERT_MAX_CUSTOM;
    if (!Number.isFinite(amount) || amount < min || amount > max) {
      errors.amount = `Сумма от ${min.toLocaleString("ru-RU")} до ${max.toLocaleString("ru-RU")} ₽`;
      amount = 0;
    }
  }

  const buyerName = text(raw.buyerName);
  if (buyerName.length < 2 || buyerName.length > 80) errors.buyerName = "Как вас зовут?";
  const buyerPhone = normalizePhone(text(raw.buyerPhone));
  if (!buyerPhone) errors.buyerPhone = "Номер в формате +7 900 123-45-67";
  const buyerEmail = text(raw.buyerEmail);
  if (buyerEmail && (buyerEmail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail))) errors.buyerEmail = "Проверьте e-mail";
  const receiptVia: ReceiptVia = text(raw.receiptVia) === "email" ? "email" : "sms";
  if (receiptVia === "email" && !buyerEmail) errors.buyerEmail = "Укажите e-mail — пришлём на него чек";
  const recipientName = text(raw.recipientName);
  if (recipientName.length > 80) errors.recipientName = "Не длиннее 80 символов";
  const message = text(raw.message);
  if (message.length > 300) errors.message = "Не длиннее 300 символов";
  if (raw.consent !== true) errors.consent = "Нужно согласие на обработку данных";

  if (Object.keys(errors).length > 0 || !offer || !buyerPhone) return { ok: false, errors };
  return {
    ok: true,
    input: {
      kind: offer.kind,
      amount,
      buyerName,
      buyerPhone,
      buyerEmail: buyerEmail || null,
      recipientName: recipientName || null,
      message: message || null,
      receiptVia,
      consent: true,
    },
  };
}

export type CertSummary = { sold: number; redeemed: number; outstanding: number; expiredBalance: number; pending: number };

/** Сводка для админки: продано, оказано, ещё должны клиентам, сгорело, ждут оплаты. */
export function certSummary(rows: CertificateRow[], now = Date.now()): CertSummary {
  const summary: CertSummary = { sold: 0, redeemed: 0, outstanding: 0, expiredBalance: 0, pending: 0 };
  for (const row of rows) {
    const view = certView(row, now);
    if (view === "pending") summary.pending += row.amount;
    if (view === "paid" || view === "used" || view === "expired") {
      summary.sold += row.amount;
      summary.redeemed += row.amount + (row.bonus ?? 0) - row.balance;
    }
    if (view === "paid") summary.outstanding += row.balance;
    if (view === "expired") summary.expiredBalance += row.balance;
  }
  return summary;
}
