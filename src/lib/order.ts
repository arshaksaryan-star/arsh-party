/**
 * Заказ с мангала: зоны доставки, расчёт суммы и проверка формы.
 * Один код для корзины в браузере и для сервера (/api/order). Цены сервер берёт из базы, не из браузера.
 */

import type { SiteConfig } from "@/content/site";
import { COIN_CAP_MANGAL, normalizeRefCode } from "@/lib/ambassadors";
import { normalizePhone } from "@/lib/lead";

export type DeliveryZone = "near" | "far" | "outside" | "pickup";
export type Payment = "cash" | "card";

export type OrderSettings = {
  minSum: number;
  nearPrice: number | null;
  farPrice: number | null;
  /** Адрес самовывоза; null — самовывоза нет. */
  pickupAddress: string | null;
};

function toRubles(value: string | null): number | null {
  if (!value) return null;
  const number = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

export function orderSettings(site: SiteConfig): OrderSettings {
  return {
    minSum: toRubles(site.orderMinSum) ?? 0,
    nearPrice: toRubles(site.deliveryNearPrice),
    farPrice: toRubles(site.deliveryFarPrice),
    pickupAddress: site.address,
  };
}

export type ZoneOption = { value: DeliveryZone; label: string; hint: string; fee: number | null };

export function zoneOptions(settings: OrderSettings): ZoneOption[] {
  const list: ZoneOption[] = [
    { value: "near", label: "До 3 км", hint: settings.pickupAddress ? `от ${settings.pickupAddress}` : "по Рязани", fee: settings.nearPrice },
    { value: "far", label: "Дальше 3 км", hint: "по Рязани", fee: settings.farPrice },
    { value: "outside", label: "За город", hint: "стоимость согласуем по телефону", fee: null },
  ];
  if (settings.pickupAddress) list.push({ value: "pickup", label: "Самовывоз", hint: settings.pickupAddress, fee: 0 });
  return list;
}

export function formatRub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

export type PricedLine = { id: string; title: string; qty: number; price: number | null };

export type OrderTotals = {
  /** Сумма блюд с известной ценой. */
  subtotal: number;
  /** Есть блюда без цены — итог уточнится по телефону. */
  hasUnpriced: boolean;
  fee: number | null;
  /** null — итог уточняется (цена блюда или доставки неизвестна). */
  total: number | null;
  /** Сколько не хватает до минимальной суммы; 0 — хватает. */
  missing: number;
  /** Сколько шашлыкоинов списано (≤ 30% блюд). */
  coins: number;
};

/** Плюшки по коду друга и списание шашлыкоинов. */
export type TotalsExtras = { freeDelivery?: boolean; coins?: number };

/** Максимум шашлыкоинов на заказ с мангала: 30% стоимости блюд. */
export function coinCap(subtotal: number): number {
  return Math.floor((subtotal * COIN_CAP_MANGAL) / 100);
}

export function computeTotals(lines: PricedLine[], zone: DeliveryZone | null, settings: OrderSettings, extras: TotalsExtras = {}): OrderTotals {
  const subtotal = lines.reduce((sum, line) => sum + (line.price ?? 0) * line.qty, 0);
  const hasUnpriced = lines.some((line) => line.price === null);
  const option = zone ? zoneOptions(settings).find((item) => item.value === zone) : undefined;
  const fee = option ? (extras.freeDelivery && (zone === "near" || zone === "far") ? 0 : option.fee) : null;
  const coins = Math.max(0, Math.min(Math.floor(extras.coins ?? 0), coinCap(subtotal)));
  // Блюда «цена уточняется» не мешают оформить заказ: минималку проверяем по известным ценам.
  const missing = hasUnpriced ? 0 : Math.max(0, settings.minSum - subtotal);
  const total = hasUnpriced || fee === null ? null : subtotal + fee - coins;
  return { subtotal, hasUnpriced, fee, total, missing, coins };
}

/** Время доставки: «как можно скорее» или получасовые интервалы 11:00–23:00. */
export const DELIVERY_SLOTS: readonly string[] = Array.from({ length: 24 }, (_, i) => {
  const minutes = 11 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
}).filter((slot) => slot <= "22:30");

export type OrderInput = {
  clientId: string | null;
  name: string;
  phone: string;
  zone: DeliveryZone;
  address: string;
  deliverAt: string;
  payment: Payment;
  comment: string | null;
  items: { id: string; qty: number }[];
  consent: boolean;
  /** Код друга-амбассадора (необязательно). */
  refCode: string | null;
  /** Ключ кабинета амбассадора — чтобы списать его шашлыкоины. */
  ambSecret: string | null;
  useCoins: boolean;
};

export type OrderField = "name" | "phone" | "zone" | "address" | "deliverAt" | "payment" | "comment" | "items" | "consent";
export type OrderErrors = Partial<Record<OrderField, string>>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateOrder(raw: Record<string, unknown>): { ok: true; order: OrderInput } | { ok: false; errors: OrderErrors } {
  const errors: OrderErrors = {};
  const name = text(raw.name);
  const phone = normalizePhone(text(raw.phone));
  const zone = text(raw.zone) as DeliveryZone;
  const address = text(raw.address);
  const deliverAt = text(raw.deliverAt) || "asap";
  const payment = text(raw.payment) as Payment;
  const comment = text(raw.comment);

  if (name.length < 2 || name.length > 80) errors.name = "Как к вам обращаться?";
  if (!phone) errors.phone = "Номер в формате +7 900 123-45-67";
  if (!["near", "far", "outside", "pickup"].includes(zone)) errors.zone = "Выберите, куда везти";
  if (zone !== "pickup" && (address.length < 5 || address.length > 300)) errors.address = "Улица, дом, подъезд и квартира";
  if (deliverAt !== "asap" && !DELIVERY_SLOTS.includes(deliverAt)) errors.deliverAt = "Выберите время";
  if (payment !== "cash" && payment !== "card") errors.payment = "Как удобнее оплатить?";
  if (comment.length > 1000) errors.comment = "Не длиннее 1000 символов";
  if (raw.consent !== true) errors.consent = "Нужно согласие на обработку данных";

  const items: { id: string; qty: number }[] = [];
  if (Array.isArray(raw.items)) {
    for (const item of raw.items.slice(0, 50)) {
      const id = typeof item === "object" && item !== null ? text((item as Record<string, unknown>).id) : "";
      const qty = typeof item === "object" && item !== null ? Number((item as Record<string, unknown>).qty) : 0;
      if (/^[0-9a-f-]{36}$/.test(id) && Number.isInteger(qty) && qty >= 1 && qty <= 99) items.push({ id, qty });
    }
  }
  if (items.length === 0) errors.items = "Заказ пуст — выберите блюда";

  const clientId = text(raw.clientId);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    order: {
      clientId: /^[0-9a-f-]{36}$/.test(clientId) ? clientId : null,
      name,
      phone: phone as string,
      zone,
      address: zone === "pickup" ? "Самовывоз" : address,
      deliverAt,
      payment,
      comment: comment || null,
      items,
      consent: true,
      refCode: normalizeRefCode(raw.refCode),
      ambSecret: typeof raw.ambSecret === "string" && /^[a-f0-9]{32}$/.test(raw.ambSecret) ? raw.ambSecret : null,
      useCoins: raw.useCoins === true,
    },
  };
}
