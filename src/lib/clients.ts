/**
 * Клиенты Arsh Party: уровни, температура, день рождения, гонка квартала.
 * Общий код для админки, личного кабинета и тестов — без обращения к базе.
 */

export type ClientRow = {
  id: string;
  num: number;
  /** Имя. */
  name: string;
  /** Фамилия (необязательно). */
  last_name?: string | null;
  phone: string | null;
  company: string | null;
  is_company: boolean;
  birth_day: number | null;
  birth_month: number | null;
  birth_year: number | null;
  occasion: string | null;
  source: string | null;
  consent_ads: boolean;
  next_step: string | null;
  next_step_at: string | null;
  note: string | null;
  /** Уровень, выставленный вручную (например, AP Card авансом); null — по сумме. */
  tier_manual?: Tier | null;
  /** Ручная отметка «вернуть». */
  mark_back?: boolean;
  created_at: string;
};

export type ClientOrder = {
  id: string;
  client_id: string | null;
  /** ГГГГ-ММ-ДД */
  date: string;
  amount: number;
  stars: string[];
  note: string | null;
  source: "manual" | "import" | "site";
  verified: boolean;
};

export type Tier = "guest" | "friend" | "own" | "card";

/** Уровни по сумме за всё время (владелец, 14.11.2026): до 10 000 · 10–50 000 · 50–100 000 · от 100 000 — AP Card. */
export const TIERS: readonly { id: Tier; label: string; emoji: string; from: number }[] = [
  { id: "guest", label: "Гость", emoji: "⚪", from: 0 },
  { id: "friend", label: "Друг", emoji: "🟠", from: 10_000 },
  { id: "own", label: "Свой", emoji: "🔴", from: 50_000 },
  { id: "card", label: "AP Card", emoji: "⭐", from: 100_000 },
];

export function tierOf(total: number): Tier {
  let tier: Tier = "guest";
  for (const item of TIERS) if (total >= item.from) tier = item.id;
  return tier;
}

export type Temperature = "hot" | "warm" | "cool" | "sleep" | "none";

export const TEMPERATURE: Record<Temperature, { label: string; emoji: string; rank: number }> = {
  hot: { label: "до 3 мес", emoji: "🔥", rank: 4 },
  warm: { label: "3–6 мес", emoji: "🙂", rank: 3 },
  cool: { label: "6–12 мес", emoji: "🧊", rank: 2 },
  sleep: { label: "больше года", emoji: "💤", rank: 1 },
  none: { label: "нет заказов", emoji: "·", rank: 0 },
};

function monthsBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T12:00:00`);
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) - (to.getDate() < from.getDate() ? 1 : 0);
}

export function temperatureOf(lastDate: string | null, now = new Date()): Temperature {
  if (!lastDate) return "none";
  const months = monthsBetween(lastDate, now);
  if (months < 3) return "hot";
  if (months < 6) return "warm";
  if (months < 12) return "cool";
  return "sleep";
}

/** Квартал по дате: 2026-Q4. Гонка обнуляется 1 января, 1 апреля, 1 июля и 1 октября. */
export function quarterOf(date: Date | string): string {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

export function quarterLabel(quarter: string): string {
  const [year, q] = quarter.split("-Q");
  const months = ["январь–март", "апрель–июнь", "июль–сентябрь", "октябрь–декабрь"][Number(q) - 1];
  return `${q}-й квартал ${year} (${months})`;
}

/**
 * Сколько дней до ближайшего дня рождения (0 — сегодня, отрицательное — был до 7 дней назад).
 * null — дата не указана. Окно спецпредложения: от −7 до +7.
 */
export function birthdayOffset(day: number | null, month: number | null, now = new Date()): number | null {
  if (!day || !month) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let best: number | null = null;
  for (const year of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
    // 29 февраля в невисокосный год — 28-е.
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const diff = Math.round((Date.UTC(year, month - 1, Math.min(day, lastDay)) - today) / 86_400_000);
    if (diff >= -7 && (best === null || diff < best)) best = diff;
  }
  return best;
}

export type ClientStats = {
  total: number;
  count: number;
  first: string | null;
  last: string | null;
  quarter: number;
  stars: string[];
  unverified: number;
  tier: Tier;
  /** Уровень выставлен вручную. */
  tierManual: boolean;
  temperature: Temperature;
  birthday: number | null;
};

export function clientStats(client: Pick<ClientRow, "birth_day" | "birth_month" | "tier_manual">, orders: ClientOrder[], now = new Date()): ClientStats {
  const currentQuarter = quarterOf(now);
  let total = 0;
  let quarter = 0;
  let unverified = 0;
  const stars = new Set<string>();
  let first: string | null = null;
  let last: string | null = null;
  for (const order of orders) {
    total += order.amount;
    if (quarterOf(order.date) === currentQuarter) quarter += order.amount;
    if (!order.verified) unverified++;
    order.stars.forEach((star) => stars.add(star));
    if (!first || order.date < first) first = order.date;
    if (!last || order.date > last) last = order.date;
  }
  return {
    total,
    count: orders.length,
    first,
    last,
    quarter,
    stars: [...stars],
    unverified,
    tier: client.tier_manual ?? tierOf(total),
    tierManual: Boolean(client.tier_manual),
    temperature: temperatureOf(last, now),
    birthday: birthdayOffset(client.birth_day, client.birth_month, now),
  };
}

/** Для публичной гонки: только имя и последние 4 цифры номера — «Наталья · •••• 90-73». */
export function maskedName(name: string, phone: string | null): string {
  const first = name.trim().split(/\s+/)[0]?.replace(/[^\p{L}\-]/gu, "") || "Гость";
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? `${first} · •••• ${digits.slice(-4, -2)}-${digits.slice(-2)}` : first;
}

export function clientCode(num: number): string {
  return `AP-${String(num).padStart(4, "0")}`;
}

export const RACE_SIZE = 50;
