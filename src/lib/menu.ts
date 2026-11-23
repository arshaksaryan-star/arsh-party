/**
 * Меню доставки с мангала: модель, категории и проверка полей.
 * Позиции, цены и фото владелец ведёт в админке; хранятся в Supabase (таблица menu_items).
 */

export const MENU_TAG = "menu";

export const MENU_CATEGORIES = [
  { id: "shashlik", label: "Шашлык" },
  { id: "chicken", label: "Курица" },
  { id: "lulya", label: "Люля-кебаб" },
  { id: "fish", label: "Рыба" },
  { id: "vegetables", label: "Овощи и грибы" },
  { id: "sides", label: "Гарниры и лаваш" },
  { id: "sauces", label: "Соусы" },
  { id: "sets", label: "Наборы" },
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number]["id"];

export type MenuItem = {
  id: string;
  category: MenuCategory;
  title: string;
  weight: string | null;
  description: string | null;
  /** Цена в рублях; null — «Цена уточняется». */
  price: number | null;
  image_url: string | null;
  is_available: boolean;
  sort: number;
};

export type MenuItemInput = Omit<MenuItem, "id" | "image_url">;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function categoryLabel(id: string): string {
  return MENU_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

/** «1 290 ₽» или «Цена уточняется». */
export function formatPrice(price: number | null): string {
  return price === null ? "Цена уточняется" : `${price.toLocaleString("ru-RU")} ₽`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateMenuItem(
  raw: Record<string, unknown>,
): { ok: true; item: MenuItemInput } | { ok: false; error: string } {
  const title = text(raw.title);
  if (title.length < 2 || title.length > 80) return { ok: false, error: "Название — от 2 до 80 символов" };

  const category = text(raw.category);
  if (!MENU_CATEGORIES.some((item) => item.id === category)) return { ok: false, error: "Выберите категорию" };

  const priceRaw = text(raw.price).replace(/\s/g, "").replace(",", ".");
  let price: number | null = null;
  if (priceRaw) {
    const value = Number(priceRaw);
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000) return { ok: false, error: "Цена — число от 0 до 1 000 000" };
    price = Math.round(value);
  }

  const sortRaw = text(raw.sort);
  const sort = sortRaw ? Number(sortRaw) : 0;
  if (!Number.isInteger(sort)) return { ok: false, error: "Порядок — целое число" };

  const weight = text(raw.weight);
  const description = text(raw.description);
  if (weight.length > 40) return { ok: false, error: "Вес или объём — до 40 символов" };
  if (description.length > 300) return { ok: false, error: "Описание — до 300 символов" };

  return {
    ok: true,
    item: {
      title,
      category: category as MenuCategory,
      price,
      sort,
      weight: weight || null,
      description: description || null,
      is_available: raw.is_available === "on" || raw.is_available === true || raw.is_available === "true",
    },
  };
}
