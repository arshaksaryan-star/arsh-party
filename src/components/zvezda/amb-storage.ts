/** Браузер помнит: код друга, по которому пришли (?ot=), и ключ своего кабинета амбассадора. */
export const REF_KEY = "arsh:ref";
export const AMB_KEY = "arsh:amb";

export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // хранилище недоступно — код можно ввести руками
  }
}
