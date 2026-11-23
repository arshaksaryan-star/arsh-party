import type { DirectionSlug } from "@/content/directions";

/**
 * Ссылки на форму заявки с выбранным направлением: «#order-sshp».
 * Обычный якорь: браузер сам прокручивает к форме (у неё есть такие якоря),
 * а форма по hashchange подставляет направление.
 */

const PREFIX = "#order-";

export function orderHref(slug: DirectionSlug): string {
  return `${PREFIX}${slug}`;
}

export function directionFromHash(hash: string): string | null {
  return hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : null;
}
