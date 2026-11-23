import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

/**
 * Вход в админку по одному паролю владельца.
 *
 * Пароль задаётся в переменной окружения ADMIN_PASSWORD и в код не попадает.
 * После входа браузер получает cookie вида «срок.подпись»: подпись — HMAC-SHA256
 * от срока действия на секрете ADMIN_SESSION_SECRET (или на самом пароле).
 * Подделать cookie без секрета нельзя; смена пароля завершает все сессии.
 */

export const ADMIN_COOKIE = "arsh_admin";
const SESSION_DAYS = 30;

function secret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(`arsh-admin:${payload}`).digest("hex");
}

/** Сравнение строк за постоянное время: по длине и содержимому ничего не угадать. */
function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function checkPassword(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return safeEqual(candidate, password);
}

export function createSessionToken(now = Date.now()): { token: string; expires: Date } {
  const key = secret();
  if (!key) throw new Error("ADMIN_PASSWORD не задан");
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return { token: `${expires}.${sign(String(expires), key)}`, expires: new Date(expires) };
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < now) return false;
  return safeEqual(signature, sign(expires, key));
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/**
 * Флаг Secure ставим, только когда страница открыта по https (nginx передаёт X-Forwarded-Proto).
 * Иначе браузер молча не сохранит вход, пока сайт открыт по IP без сертификата.
 */
async function secureCookie(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;
  const proto = (await headers()).get("x-forwarded-proto");
  return proto ? proto.split(",")[0].trim() === "https" : true;
}

export async function startSession(): Promise<void> {
  const { token, expires } = createSessionToken();
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: await secureCookie(),
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

/* ───────────── Кухня: отдельный пароль, доступ только к «Сегодня на огне» ─────────────
 * Повар отмечает, какие блюда есть сегодня, и не видит остальную админку.
 * Пароль кухни — KITCHEN_PASSWORD. Владелец, вошедший в админку, на кухню попадает без пароля.
 */

export const KITCHEN_COOKIE = "arsh_kitchen";

function kitchenSecret(): string | null {
  // Смена пароля кухни выкидывает кухню, но не владельца.
  const base = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  const kitchen = process.env.KITCHEN_PASSWORD;
  return kitchen ? `${base ?? ""}:${kitchen}` : null;
}

function signKitchen(payload: string, key: string): string {
  // Другая приставка: подпись кухни никогда не подойдёт как подпись админки.
  return createHmac("sha256", key).update(`arsh-kitchen:${payload}`).digest("hex");
}

export function isKitchenConfigured(): boolean {
  return Boolean(process.env.KITCHEN_PASSWORD);
}

export function checkKitchenPassword(candidate: string): boolean {
  const password = process.env.KITCHEN_PASSWORD;
  if (!password) return false;
  return safeEqual(candidate, password);
}

export function createKitchenToken(now = Date.now()): { token: string; expires: Date } {
  const key = kitchenSecret();
  if (!key) throw new Error("KITCHEN_PASSWORD не задан");
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return { token: `${expires}.${signKitchen(String(expires), key)}`, expires: new Date(expires) };
}

export function verifyKitchenToken(token: string | undefined, now = Date.now()): boolean {
  const key = kitchenSecret();
  if (!key || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < now) return false;
  return safeEqual(signature, signKitchen(expires, key));
}

/** На кухню пускаем повара с паролем кухни и владельца из админки. */
export async function canUseKitchen(): Promise<boolean> {
  const store = await cookies();
  if (verifySessionToken(store.get(ADMIN_COOKIE)?.value)) return true;
  return verifyKitchenToken(store.get(KITCHEN_COOKIE)?.value);
}

export async function startKitchenSession(): Promise<void> {
  const { token, expires } = createKitchenToken();
  const store = await cookies();
  store.set(KITCHEN_COOKIE, token, {
    httpOnly: true,
    secure: await secureCookie(),
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endKitchenSession(): Promise<void> {
  const store = await cookies();
  store.delete(KITCHEN_COOKIE);
}
