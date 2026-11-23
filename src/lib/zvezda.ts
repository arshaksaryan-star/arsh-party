import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { coinBalance, type AmbassadorRow, type CoinRow } from "@/lib/ambassadors";
import { CONTENT_TAG } from "@/lib/content";
import { isSupabaseConfigured, selectRows, type ReadCache } from "@/lib/supabase";
import { DEFAULT_ZVEZDA, parseZvezda, type ZvezdaSettings } from "@/lib/zvezda-shared";

/**
 * Вход на тайную страницу /zvezda: пароль с визитки (ZVEZDA_PASSWORD) или QR-ссылка /zvezda/vhod?k=пароль.
 * После входа — подписанный cookie на 30 дней. Пароль меняется в .env.local, старые входы гаснут.
 */

export const ZVEZDA_COOKIE = "arsh_zvezda";
const DAYS = 30;

function key(): string | null {
  const password = process.env.ZVEZDA_PASSWORD;
  if (!password) return null;
  return `${process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ""}:${password}`;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`arsh-zvezda:${payload}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function isZvezdaConfigured(): boolean {
  return Boolean(process.env.ZVEZDA_PASSWORD);
}

/** Пароль сравниваем без регистра и пробелов: его диктуют и набирают с визитки. */
export function checkZvezdaPassword(candidate: string): boolean {
  const password = process.env.ZVEZDA_PASSWORD;
  if (!password) return false;
  const clean = (value: string) => value.toLowerCase().replace(/\s+/g, "");
  return safeEqual(clean(candidate), clean(password));
}

export function createZvezdaToken(now = Date.now()): { token: string; expires: Date } {
  const secret = key();
  if (!secret) throw new Error("ZVEZDA_PASSWORD не задан");
  const expires = now + DAYS * 24 * 60 * 60 * 1000;
  return { token: `${expires}.${sign(String(expires), secret)}`, expires: new Date(expires) };
}

export function verifyZvezdaToken(token: string | undefined, now = Date.now()): boolean {
  const secret = key();
  if (!secret || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(signature, sign(expires, secret));
}

export async function hasZvezdaAccess(): Promise<boolean> {
  const store = await cookies();
  return verifyZvezdaToken(store.get(ZVEZDA_COOKIE)?.value);
}

export async function zvezdaCookieSecure(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;
  const proto = (await headers()).get("x-forwarded-proto");
  return proto ? proto.split(",")[0].trim() === "https" : true;
}

export async function startZvezdaSession(): Promise<void> {
  const { token, expires } = createZvezdaToken();
  const store = await cookies();
  store.set(ZVEZDA_COOKIE, token, { httpOnly: true, secure: await zvezdaCookieSecure(), sameSite: "lax", path: "/", expires });
}

/* ───────────── Настройки и амбассадоры ───────────── */

export async function loadZvezda(readCache: ReadCache = { revalidate: 300, tags: [CONTENT_TAG] }): Promise<ZvezdaSettings> {
  if (!isSupabaseConfigured()) return parseZvezda(null);
  try {
    const rows = await selectRows<{ key: string; data: unknown }>("content", "?select=key,data&key=eq.zvezda", readCache);
    return parseZvezda(rows[0]?.data);
  } catch (error) {
    console.error("[zvezda] settings", error);
    return { ...DEFAULT_ZVEZDA };
  }
}

/** Секретный ключ кабинета: только [a-f0-9], 32 символа. */
export function isSecret(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
}

export async function ambassadorBySecret(secret: string): Promise<AmbassadorRow | null> {
  if (!isSecret(secret)) return null;
  const [row] = await selectRows<AmbassadorRow>("ambassadors", `?select=*&secret=eq.${secret}&limit=1`, "no-store");
  return row ?? null;
}

export async function ambassadorByCode(code: string): Promise<AmbassadorRow | null> {
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return null;
  const [row] = await selectRows<AmbassadorRow>("ambassadors", `?select=*&code=eq.${code}&limit=1`, "no-store");
  return row ?? null;
}

export async function ambassadorByPhone(phone: string): Promise<AmbassadorRow | null> {
  const [row] = await selectRows<AmbassadorRow>("ambassadors", `?select=*&phone=eq.${encodeURIComponent(phone)}&limit=1`, "no-store");
  return row ?? null;
}

export async function ledgerOf(ambassadorId: string): Promise<CoinRow[]> {
  return selectRows<CoinRow>("coin_ledger", `?select=*&ambassador_id=eq.${ambassadorId}&order=created_at.desc&limit=500`, "no-store");
}

export async function balanceOf(ambassadorId: string): Promise<number> {
  return coinBalance(await ledgerOf(ambassadorId));
}
