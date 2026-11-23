/**
 * Пять звёзд Arsh Party — значения по умолчанию.
 * Тексты (название, строка пользы, теги, кнопка) владелец меняет в админке,
 * правки накладываются поверх этих данных (см. src/lib/content.ts).
 */

export type StarColor = "orange" | "red" | "green" | "pink" | "blue";

export type DirectionSlug = "mangal" | "sshp" | "catering" | "events" | "host";

/** menu — меню с корзиной и доставкой; lead — заявка и звонок. */
export type DirectionMode = "menu" | "lead";

export type DirectionVisual =
  /** Фирменный логотип направления (SVG в public/brand/directions). */
  | { kind: "logo"; src: string; width: number; height: number }
  /** Фото, когда логотипа нет. */
  | { kind: "photo"; src: string; alt: string };

export type Direction = {
  slug: DirectionSlug;
  star: StarColor;
  /** Полное название, как на логотипе направления. */
  title: string;
  /** Короткое имя для кнопок созвездия и навигации. */
  short: string;
  /** Одна строка пользы. */
  tagline: string;
  /** Конкретика: формат, сроки, поводы. */
  tags: readonly string[];
  /** Текст главного действия. */
  cta: string;
  mode: DirectionMode;
  /** Подпись механики на карточке. */
  modeLabel: string;
  visual: DirectionVisual;
};

export const defaultDirections: readonly Direction[] = [
  {
    slug: "mangal",
    star: "orange",
    title: "Доставка блюд с мангала",
    short: "Мангал",
    tagline: "Дегустационная доставка: что сегодня на огне — привезём горячим.",
    tags: ["Дегустационная доставка", "Каждый день 11:00–23:00", "Свежая подача", "Авторские рецепты"],
    cta: "Открыть меню",
    mode: "menu",
    modeLabel: "Меню и доставка",
    visual: { kind: "logo", src: "/brand/directions/mangal.svg", width: 693, height: 285 },
  },
  {
    slug: "sshp",
    star: "red",
    title: "Скорая шашлычная помощь",
    short: "СШП",
    tagline: "Гости едут, мангал есть, рук нет. Приедем, разожжём, накормим.",
    tags: ["Срочный выезд", "День-в-день", "От 10 человек", "Выездной гриль"],
    cta: "Вызвать СШП",
    mode: "lead",
    modeLabel: "Срочный выезд",
    visual: { kind: "logo", src: "/brand/directions/sshp.svg", width: 687, height: 297 },
  },
  {
    slug: "catering",
    star: "green",
    title: "Событийный кейтеринг",
    short: "Кейтеринг",
    tagline: "Банкет, фуршет или кофе-брейк под ваш формат и число гостей.",
    tags: ["Фуршеты", "Банкеты", "Кофе-брейки", "Корпоративы"],
    cta: "Рассчитать",
    mode: "lead",
    modeLabel: "Заявка",
    visual: { kind: "logo", src: "/brand/directions/catering.svg", width: 753, height: 298 },
  },
  {
    slug: "events",
    star: "pink",
    title: "Организация мероприятий",
    short: "Праздник",
    tagline: "Праздник под ключ: идея, площадка, подрядчики и тайминг.",
    tags: ["Свадьбы", "Корпоративы", "Дни рождения", "Под ключ"],
    cta: "Обсудить праздник",
    mode: "lead",
    modeLabel: "Заявка",
    visual: { kind: "logo", src: "/brand/directions/events.svg", width: 748, height: 296 },
  },
  {
    slug: "host",
    star: "blue",
    title: "Ведущий вашего торжества",
    short: "Ведущий",
    tagline: "Свадьбы, юбилеи, корпоративы. Проверьте, свободна ли ваша дата.",
    tags: ["Свадьбы", "Юбилеи", "Корпоративы", "Без шаблонных скриптов"],
    cta: "Проверить дату",
    mode: "lead",
    modeLabel: "Заявка",
    visual: { kind: "photo", src: "/photos/arsh-host-hat.jpg", alt: "Арш ведёт мероприятие с микрофоном" },
  },
];

export function getDirection(slug: string, list: readonly Direction[] = defaultDirections): Direction | undefined {
  return list.find((direction) => direction.slug === slug);
}

/** Тексты направления, которые можно менять в админке. */
export const EDITABLE_DIRECTION_KEYS = ["title", "short", "tagline", "tags", "cta"] as const;
export type EditableDirectionKey = (typeof EDITABLE_DIRECTION_KEYS)[number];

/** CSS-переменные акцента для элемента, окрашенного в цвет звезды. */
export function accentVars(star: StarColor): Record<"--accent" | "--on-accent", string> {
  return {
    "--accent": `var(--c-${star})`,
    "--on-accent": `var(--on-${star})`,
  };
}
