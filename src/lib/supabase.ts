/**
 * Минимальный клиент базы без сторонних библиотек: REST (PostgREST) и хранилище файлов.
 * Только для сервера: ключ service_role обходит RLS и не должен попасть в браузер.
 *
 * Два режима:
 * - Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) — для разработки на компьютере;
 * - свой сервер в России (POSTGREST_URL + STORAGE_DIR): PostgREST поверх своего Postgres
 *   слушает только 127.0.0.1, файлы лежат на диске сервера (см. lib/local-files.ts).
 */
import { localFiles, usesLocalFiles } from "@/lib/local-files";

type Row = Record<string, unknown>;

/** Как кэшировать чтение: для сайта — с тегом и сроком, для админки — без кэша. */
export type ReadCache = { revalidate: number; tags: string[] } | "no-store";

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.POSTGREST_URL || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY));
}

function baseUrl(): string {
  return (process.env.SUPABASE_URL as string).replace(/\/+$/, "");
}

/** Адрес REST: свой PostgREST или REST внутри Supabase. */
function restBase(): string {
  if (process.env.POSTGREST_URL) return process.env.POSTGREST_URL.replace(/\/+$/, "");
  return `${baseUrl()}/rest/v1`;
}

function authHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Свой PostgREST доступен только изнутри сервера и ключа не требует.
  if (process.env.POSTGREST_URL || !key) return {};
  const result: Record<string, string> = { apikey: key };
  // Старые ключи — это JWT (начинаются с «eyJ») и передаются ещё и как Bearer.
  // Новые секретные ключи (sb_secret_…) передаются только в заголовке apikey.
  if (key.startsWith("eyJ")) result.Authorization = `Bearer ${key}`;
  return result;
}

function headers(): Record<string, string> {
  return { ...authHeaders(), "Content-Type": "application/json" };
}

/**
 * Сколько ждём ответа базы. Если Supabase недоступен (например, без VPN),
 * сайт быстро сдаётся и показывает данные по умолчанию вместо долгой загрузки.
 */
const TIMEOUT_MS = 4000;
/** Загрузка фото меню через сервер идёт дольше обычного запроса. */
const UPLOAD_TIMEOUT_MS = 30000;

function sbFetch(url: string, init: RequestInit & { next?: { revalidate: number; tags: string[] } }, timeoutMs = TIMEOUT_MS) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

function endpoint(table: string, query = ""): string {
  return `${restBase()}/${table}${query}`;
}

async function fail(response: Response, what: string): Promise<never> {
  const details = await response.text().catch(() => "");
  throw new Error(`Supabase ${what}: ${response.status} ${details.slice(0, 300)}`);
}

/** Чтение строк. query — строка PostgREST, например "?select=*&order=sort.asc". */
export async function selectRows<T extends Row>(table: string, query: string, cache: ReadCache): Promise<T[]> {
  const response = await sbFetch(endpoint(table, query), {
    headers: headers(),
    ...(cache === "no-store" ? { cache: "no-store" as const } : { next: cache }),
  });
  if (!response.ok) await fail(response, `select ${table}`);
  return (await response.json()) as T[];
}

/** Вставляет строку и возвращает её со всеми полями (id, number, created_at). */
export async function insertRow<T extends Row>(table: string, row: Row): Promise<T> {
  const response = await sbFetch(endpoint(table), {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(row),
    cache: "no-store",
  });
  if (!response.ok) await fail(response, `insert ${table}`);
  const rows = (await response.json()) as T[];
  return rows[0];
}

/** Вставка или обновление по первичному ключу. */
export async function upsertRow<T extends Row>(table: string, row: Row): Promise<T> {
  const response = await sbFetch(endpoint(table), {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(row),
    cache: "no-store",
  });
  if (!response.ok) await fail(response, `upsert ${table}`);
  const rows = (await response.json()) as T[];
  return rows[0];
}

export async function updateRow(table: string, id: string, patch: Row): Promise<void> {
  const response = await sbFetch(endpoint(table, `?id=eq.${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!response.ok) await fail(response, `update ${table}`);
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const response = await sbFetch(endpoint(table, `?id=eq.${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) await fail(response, `delete ${table}`);
}

/* ───────────── Storage: фото меню ───────────── */

export const MEDIA_BUCKET = "media";

/** Загружает файл в публичное хранилище и возвращает его постоянную ссылку. */
export async function uploadPublicFile(path: string, body: ArrayBuffer, contentType: string): Promise<string> {
  if (usesLocalFiles()) return localFiles.uploadPublic(path, body);
  const response = await sbFetch(`${baseUrl()}/storage/v1/object/${MEDIA_BUCKET}/${path}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "31536000" },
    body,
    cache: "no-store",
  }, UPLOAD_TIMEOUT_MS);
  if (!response.ok) await fail(response, "upload");
  return `${baseUrl()}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/** Удаляет файл по его публичной ссылке; чужие ссылки игнорирует. */
export async function deletePublicFile(publicUrl: string): Promise<void> {
  if (usesLocalFiles()) return localFiles.deletePublic(publicUrl);
  const prefix = `${baseUrl()}/storage/v1/object/public/${MEDIA_BUCKET}/`;
  if (!publicUrl.startsWith(prefix)) return;
  const path = publicUrl.slice(prefix.length);
  const response = await sbFetch(`${baseUrl()}/storage/v1/object/${MEDIA_BUCKET}`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ prefixes: [path] }),
    cache: "no-store",
  });
  if (!response.ok) await fail(response, "delete file");
}

/* ───────────── Storage: закрытые файлы (фото и видео к отзывам) ───────────── */

export const REVIEW_BUCKET = "review-uploads";

/** Supabase отдаёт ссылки относительно /storage/v1 — делаем их полными. */
function storageUrl(relative: string): string {
  return relative.startsWith("http") ? relative : `${baseUrl()}/storage/v1${relative.startsWith("/") ? "" : "/"}${relative}`;
}

/**
 * Одноразовая ссылка, по которой браузер сам загрузит файл в закрытое хранилище.
 * Так большие видео идут напрямую в Supabase, минуя сервер сайта.
 */
export async function createSignedUploadUrl(bucket: string, path: string): Promise<string> {
  if (usesLocalFiles()) return localFiles.signUpload(bucket, path);
  const response = await sbFetch(`${baseUrl()}/storage/v1/object/upload/sign/${bucket}/${path}`, {
    method: "POST",
    headers: headers(),
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) await fail(response, "sign upload");
  const data = (await response.json()) as { url?: string; token?: string };
  if (data.url) return storageUrl(data.url);
  if (data.token) return storageUrl(`/object/upload/sign/${bucket}/${path}?token=${data.token}`);
  throw new Error("Supabase sign upload: в ответе нет ссылки");
}

/** Временные ссылки на просмотр закрытых файлов. Ненайденные файлы пропускаются. */
export async function createSignedUrls(bucket: string, paths: string[], expiresIn: number): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;
  if (usesLocalFiles()) return localFiles.signRead(bucket, paths, expiresIn);
  const response = await sbFetch(`${baseUrl()}/storage/v1/object/sign/${bucket}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ expiresIn, paths }),
    cache: "no-store",
  });
  if (!response.ok) await fail(response, "sign urls");
  const items = (await response.json()) as { path: string | null; signedURL: string | null; error: string | null }[];
  for (const item of items) {
    if (item.path && item.signedURL && !item.error) result.set(item.path, storageUrl(item.signedURL));
  }
  return result;
}

export async function deleteFiles(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  if (usesLocalFiles()) return localFiles.remove(bucket, paths);
  const response = await sbFetch(`${baseUrl()}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ prefixes: paths }),
    cache: "no-store",
  });
  if (!response.ok) await fail(response, "delete files");
}
