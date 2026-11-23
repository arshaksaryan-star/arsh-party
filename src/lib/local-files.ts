/**
 * Файлы на диске своего сервера — замена Supabase Storage.
 *
 * STORAGE_DIR/
 *   media/…            публичные файлы (фото меню, праздников) → отдаются по /files/media/…
 *   review-uploads/…   закрытые файлы (фото и видео к отзывам) → только по подписанной ссылке
 *
 * Подписанные ссылки: HMAC-SHA256 от «действие|bucket|path|срок» на секрете FILES_SECRET
 * (или ADMIN_SESSION_SECRET). Загрузка — PUT /api/files/upload, просмотр — GET /api/files/get.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const PUBLIC_BUCKET = "media";
const BUCKETS = new Set(["media", "review-uploads"]);
/** Публичные файлы сайт отдаёт по этому адресу (app/files/[...path]/route.ts). */
export const PUBLIC_PREFIX = "/files/";
/** Сколько живёт ссылка на загрузку файла к отзыву. */
const UPLOAD_TTL_SECONDS = 2 * 60 * 60;

export function usesLocalFiles(): boolean {
  return Boolean(process.env.STORAGE_DIR);
}

function root(): string {
  return path.resolve(process.env.STORAGE_DIR as string);
}

function secret(): string {
  const value = process.env.FILES_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("Нет FILES_SECRET (или ADMIN_SESSION_SECRET) для подписи ссылок на файлы");
  return value;
}

/** Путь внутри хранилища: только безопасные символы, без «..», без абсолютных путей. */
export function safeObjectPath(value: string): string | null {
  if (!value || value.length > 300) return null;
  if (!/^[A-Za-z0-9._\-/]+$/.test(value)) return null;
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return null;
  return value;
}

/** Полный путь к файлу на диске или null, если bucket или путь недопустимы. */
export function diskPath(bucket: string, objectPath: string): string | null {
  if (!BUCKETS.has(bucket)) return null;
  const safe = safeObjectPath(objectPath);
  if (!safe) return null;
  const base = path.join(root(), bucket);
  const full = path.join(base, safe);
  return full.startsWith(base + path.sep) ? full : null;
}

function sign(action: "put" | "get", bucket: string, objectPath: string, expires: number): string {
  return createHmac("sha256", secret()).update(`${action}|${bucket}|${objectPath}|${expires}`).digest("base64url");
}

export function verifySignature(action: "put" | "get", bucket: string, objectPath: string, expires: number, signature: string): boolean {
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return false;
  const expected = Buffer.from(sign(action, bucket, objectPath, expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function signedUrl(endpoint: string, action: "put" | "get", bucket: string, objectPath: string, ttlSeconds: number): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const query = new URLSearchParams({ b: bucket, p: objectPath, e: String(expires), s: sign(action, bucket, objectPath, expires) });
  return `${endpoint}?${query.toString()}`;
}

export const localFiles = {
  async uploadPublic(objectPath: string, body: ArrayBuffer): Promise<string> {
    const full = diskPath(PUBLIC_BUCKET, objectPath);
    if (!full) throw new Error(`Недопустимый путь файла: ${objectPath}`);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, Buffer.from(body));
    return `${PUBLIC_PREFIX}${PUBLIC_BUCKET}/${objectPath}`;
  },

  async deletePublic(publicUrl: string): Promise<void> {
    const prefix = `${PUBLIC_PREFIX}${PUBLIC_BUCKET}/`;
    if (!publicUrl.startsWith(prefix)) return;
    const full = diskPath(PUBLIC_BUCKET, publicUrl.slice(prefix.length));
    if (full) await rm(full, { force: true });
  },

  async signUpload(bucket: string, objectPath: string): Promise<string> {
    if (!diskPath(bucket, objectPath)) throw new Error(`Недопустимый путь файла: ${objectPath}`);
    return signedUrl("/api/files/upload", "put", bucket, objectPath, UPLOAD_TTL_SECONDS);
  },

  async signRead(bucket: string, paths: string[], expiresIn: number): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    for (const objectPath of paths) {
      if (diskPath(bucket, objectPath)) result.set(objectPath, signedUrl("/api/files/get", "get", bucket, objectPath, expiresIn));
    }
    return result;
  },

  async remove(bucket: string, paths: string[]): Promise<void> {
    for (const objectPath of paths) {
      const full = diskPath(bucket, objectPath);
      if (full) await rm(full, { force: true });
    }
  },
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export function contentTypeFor(file: string): string {
  const extension = file.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}
