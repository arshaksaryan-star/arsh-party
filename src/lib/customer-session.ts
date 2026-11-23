import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

/**
 * Вход клиента в личный кабинет: после кода из Telegram или SMS браузер получает cookie
 * «телефон.срок.подпись» на 90 дней. Подпись — HMAC на секрете сайта: подделать номер нельзя.
 */

export const CUSTOMER_COOKIE = "arsh_me";
const DAYS = 90;

function secret(): string | null {
  const base = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  return base ? `${base}:customer` : null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(`arsh-me:${payload}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/** Хэш кода для таблицы login_codes: сам код в базе не хранится. */
export function hashLoginCode(phone: string, code: string): string {
  return createHmac("sha256", secret() ?? "arsh").update(`login:${phone}:${code}`).digest("hex");
}

export function isCustomerLoginReady(): boolean {
  return secret() !== null;
}

export function createCustomerToken(phone: string, now = Date.now()): { token: string; expires: Date } {
  const key = secret();
  if (!key) throw new Error("ADMIN_PASSWORD не задан");
  const expires = now + DAYS * 24 * 60 * 60 * 1000;
  const digits = phone.replace(/\D/g, "");
  return { token: `${digits}.${expires}.${sign(`${digits}.${expires}`, key)}`, expires: new Date(expires) };
}

/** Телефон из cookie (+7…) или null. */
export function verifyCustomerToken(token: string | undefined, now = Date.now()): string | null {
  const key = secret();
  if (!key || !token) return null;
  const [digits, expires, signature] = token.split(".");
  if (!digits || !expires || !signature || !/^7\d{10}$/.test(digits) || !/^\d+$/.test(expires)) return null;
  if (Number(expires) < now) return null;
  return safeEqual(signature, sign(`${digits}.${expires}`, key)) ? `+${digits}` : null;
}

export async function currentCustomer(): Promise<string | null> {
  const store = await cookies();
  return verifyCustomerToken(store.get(CUSTOMER_COOKIE)?.value);
}

async function secureCookie(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;
  const proto = (await headers()).get("x-forwarded-proto");
  return proto ? proto.split(",")[0].trim() === "https" : true;
}

export async function startCustomerSession(phone: string): Promise<void> {
  const { token, expires } = createCustomerToken(phone);
  const store = await cookies();
  store.set(CUSTOMER_COOKIE, token, { httpOnly: true, secure: await secureCookie(), sameSite: "lax", path: "/", expires });
}

export async function endCustomerSession(): Promise<void> {
  const store = await cookies();
  store.delete(CUSTOMER_COOKIE);
}

/** IP посетителя за nginx — для ограничения частоты отправки кодов. */
export async function clientIp(): Promise<string> {
  const list = await headers();
  return (list.get("x-real-ip") || list.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 64);
}
