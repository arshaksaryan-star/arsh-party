/**
 * Согласие посетителя на cookie аналитики (Яндекс Метрика).
 * Хранится в браузере посетителя. Пока выбора нет, Метрика не загружается.
 */

export type Consent = "granted" | "denied";

const STORAGE_KEY = "arsh-cookie-consent";
export const CONSENT_EVENT = "arsh:consent";
/** Событие «открыть плашку снова» — кнопка «Настройки cookie» в подвале. */
export const CONSENT_OPEN_EVENT = "arsh:consent-open";

export function readConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const choice = (JSON.parse(value) as { choice?: string }).choice;
    return choice === "granted" || choice === "denied" ? choice : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
  } catch {
    // Хранилище недоступно (приватный режим): выбор действует до перезагрузки.
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: choice }));
}
