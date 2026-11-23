/**
 * Фото Арша, которые владелец меняет в админке → «Фото Арша».
 * По умолчанию — файлы из public/photos; загруженная замена хранится в content key = "photos".
 */

export type PhotoSlot = "about-1" | "about-2" | "about-3" | "about-4" | "about-5" | "about-6" | "about-7" | "host" | "ok";

export const PHOTO_SLOTS: readonly { slot: PhotoSlot; label: string; hint: string; fallback: string }[] = [
  { slot: "about-1", label: "О нас · 1. О проекте", hint: "Портрет, на сайте — чёрно-белый", fallback: "/photos/arsh-portrait.jpg" },
  { slot: "about-2", label: "О нас · 2. Связь с городом", hint: "Арш на празднике", fallback: "/photos/arsh-host-hat.jpg" },
  { slot: "about-3", label: "О нас · 3. Семейные традиции", hint: "Семья, мангал, застолье", fallback: "/photos/arsh-grill.jpg" },
  { slot: "about-4", label: "О нас · 4. Секрет вкуса", hint: "Маринад, мясо, руки", fallback: "/photos/arsh-ok.jpg" },
  { slot: "about-5", label: "О нас · 5. С 2018 года", hint: "Работа, команда", fallback: "/photos/arsh-host.jpg" },
  { slot: "about-6", label: "О нас · 6. В цифрах", hint: "Большой праздник", fallback: "/photos/arsh-fun.jpg" },
  { slot: "about-7", label: "О нас · 7. Куда растём", hint: "Ремесло, огонь", fallback: "/photos/arsh-grill.jpg" },
  { slot: "host", label: "Карточка «Ведущий»", hint: "Главная и страница /host", fallback: "/photos/arsh-host-hat.jpg" },
  { slot: "ok", label: "Арш с жестом «ок»", hint: "Arsh Live без видео и страница отзывов /otziv", fallback: "/photos/arsh-ok.jpg" },
];

export type Photos = Record<PhotoSlot, string>;

export function defaultPhotos(): Photos {
  return Object.fromEntries(PHOTO_SLOTS.map((item) => [item.slot, item.fallback])) as Photos;
}

/** Накладывает загруженные фото на файлы по умолчанию. Берём только свои ссылки (/files/… или http(s)). */
export function mergePhotos(data: unknown): Photos {
  const photos = defaultPhotos();
  if (typeof data !== "object" || data === null || Array.isArray(data)) return photos;
  for (const { slot } of PHOTO_SLOTS) {
    const value = (data as Record<string, unknown>)[slot];
    if (typeof value === "string" && /^(\/files\/|https?:\/\/)/.test(value)) photos[slot] = value;
  }
  return photos;
}
