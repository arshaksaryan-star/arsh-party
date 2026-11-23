import type { StarColor } from "@/content/directions";

/**
 * Выбранная звезда, общая для всей страницы.
 * Hero сообщает о выборе, а искры у краёв экрана перекрашиваются в тот же цвет.
 */

export const ACCENT_EVENT = "arsh:accent";

export function announceAccent(star: StarColor) {
  document.documentElement.dataset.accent = star;
  // Точка у активного раздела в шапке берёт этот цвет.
  document.documentElement.style.setProperty("--page-accent", `var(--c-${star})`);
  window.dispatchEvent(new CustomEvent<StarColor>(ACCENT_EVENT, { detail: star }));
}

export function currentAccent(): StarColor {
  return (document.documentElement.dataset.accent as StarColor | undefined) ?? "red";
}

/** Цвет звезды из CSS-переменных: учитывает светлую и тёмную тему. */
export function readStarColor(element: Element, star: StarColor): string {
  return getComputedStyle(element).getPropertyValue(`--c-${star}`).trim() || "#ff0000";
}
