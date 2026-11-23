/** Поле телефона с готовым «+7»: общие правила для сайта и админки. */

/** Только 10 цифр после +7. Вставили «8 900…» или «+7 900…» — лишняя первая цифра отрезается. */
export function phoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** «9001234567» → «900 123-45-67», по мере ввода. */
export function formatDigits(digits: string): string {
  let out = digits.slice(0, 3);
  if (digits.length > 3) out += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) out += `-${digits.slice(8, 10)}`;
  return out;
}

/** Сколько цифр осталось: «Ещё 3 цифры». */
export function digitsLeftText(digits: string): string | null {
  const left = 10 - digits.length;
  if (digits.length === 0 || left <= 0) return null;
  return `Ещё ${left} ${left === 1 ? "цифра" : left < 5 ? "цифры" : "цифр"}`;
}
