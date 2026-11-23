/**
 * Случайный идентификатор браузера для истории заказов и заявок (ТЗ, раздел 5).
 * Хранится в localStorage; если хранилище недоступно, живёт до перезагрузки.
 */

const STORAGE_KEY = "arsh:client-id";
let memoryId: string | null = null;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Запасной вариант для старых браузеров: UUID v4 из Math.random.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function getClientId(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const id = createId();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    memoryId ??= createId();
    return memoryId;
  }
}
