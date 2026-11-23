/**
 * «Тайная звезда»: настройки, которые Арш меняет в админке (строка content key = "zvezda").
 * Общий код для сервера и браузера, без секретов.
 */

/** Тайное предложение на /zvezda. До `until` включительно (ГГГГ-ММ-ДД), пусто — бессрочно. */
export type SecretOffer = { id: string; title: string; text: string; until: string | null; hidden: boolean };

/**
 * Плюшка другу амбассадора — приходит с заказом по коду друга.
 * free_delivery — доставка по Рязани бесплатно (сайт сам обнуляет её в заказе);
 * остальное Арш кладёт в заказ руками, сайт пишет плюшку в уведомление.
 */
export type FriendPerk = { id: string; title: string; on: boolean; freeDelivery: boolean };

/** raceVisible — показывать «Гонку квартала» в личном кабинете (переключатель в админке → «Клиенты»). */
export type ZvezdaSettings = { offers: SecretOffer[]; perks: FriendPerk[]; raceVisible: boolean };

export const DEFAULT_PERKS: FriendPerk[] = [
  { id: "more5", title: "+5% шашлыка к заказу", on: true, freeDelivery: false },
  { id: "sauce", title: "Соус в подарок", on: false, freeDelivery: false },
  { id: "lavash", title: "Лаваш в подарок", on: false, freeDelivery: false },
  { id: "delivery", title: "Бесплатная доставка по Рязани", on: false, freeDelivery: true },
];

export const DEFAULT_ZVEZDA: ZvezdaSettings = { offers: [], perks: DEFAULT_PERKS, raceVisible: false };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseZvezda(data: unknown): ZvezdaSettings {
  if (!isRecord(data)) return { offers: [], perks: DEFAULT_PERKS.map((perk) => ({ ...perk })), raceVisible: false };
  const offers: SecretOffer[] = [];
  if (Array.isArray(data.offers)) {
    for (const [index, item] of data.offers.slice(0, 30).entries()) {
      if (!isRecord(item)) continue;
      const title = str(item.title, 120);
      if (!title) continue;
      const until = str(item.until, 10);
      offers.push({
        id: str(item.id, 40) || `o${index}`,
        title,
        text: str(item.text, 1000),
        until: /^\d{4}-\d{2}-\d{2}$/.test(until) ? until : null,
        hidden: item.hidden === true,
      });
    }
  }
  let perks: FriendPerk[] = DEFAULT_PERKS.map((perk) => ({ ...perk }));
  if (Array.isArray(data.perks)) {
    perks = [];
    for (const [index, item] of data.perks.slice(0, 20).entries()) {
      if (!isRecord(item)) continue;
      const title = str(item.title, 100);
      if (!title) continue;
      perks.push({ id: str(item.id, 40) || `p${index}`, title, on: item.on === true, freeDelivery: item.freeDelivery === true });
    }
  }
  return { offers, perks, raceVisible: data.raceVisible === true };
}

/** Предложения, которые видит гость сейчас (по московской дате). */
export function visibleOffers(offers: SecretOffer[], today: string): SecretOffer[] {
  return offers.filter((offer) => !offer.hidden && (!offer.until || offer.until >= today));
}

export function activePerks(perks: FriendPerk[]): FriendPerk[] {
  return perks.filter((perk) => perk.on);
}

/** Текстовое поле админки ↔ список: одна строка — одно предложение «Заголовок | Текст | до ГГГГ-ММ-ДД». */
export function offersToText(offers: SecretOffer[]): string {
  return offers.map((offer) => [offer.hidden ? `# ${offer.title}` : offer.title, offer.text, offer.until ?? ""].join(" | ").replace(/[ |]+$/, "")).join("\n");
}

export function textToOffers(text: string): SecretOffer[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line, index) => {
      const hidden = line.startsWith("#");
      const [title = "", body = "", until = ""] = line.replace(/^#\s*/, "").split("|").map((part) => part.trim());
      const date = until.replace(/^до\s*/i, "");
      return { id: `o${index}`, title: title.slice(0, 120), text: body.slice(0, 1000), until: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null, hidden };
    })
    .filter((offer) => offer.title);
}
