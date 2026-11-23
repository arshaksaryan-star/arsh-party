import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { diskPath, usesLocalFiles, verifySignature } from "@/lib/local-files";
import { checkMediaFile, mediaKindOfType, REVIEW_MEDIA } from "@/lib/site-review";

/**
 * Приём файла к отзыву по одноразовой подписанной ссылке (замена загрузки в Supabase Storage).
 * Проверяем подпись и срок, тип и размер, пишем во временный файл и переименовываем —
 * недокачанный файл не останется под настоящим именем.
 */
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  if (!usesLocalFiles()) return Response.json({ error: "Хранилище не настроено" }, { status: 404 });
  const url = new URL(request.url);
  const bucket = url.searchParams.get("b") ?? "";
  const objectPath = url.searchParams.get("p") ?? "";
  const expires = Number(url.searchParams.get("e"));
  const signature = url.searchParams.get("s") ?? "";
  if (!verifySignature("put", bucket, objectPath, expires, signature)) {
    return Response.json({ error: "Ссылка для загрузки устарела. Попробуйте ещё раз." }, { status: 403 });
  }
  const full = diskPath(bucket, objectPath);
  if (!full || !request.body) return Response.json({ error: "Нет файла" }, { status: 400 });

  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const declared = Number(request.headers.get("content-length") ?? "0");
  const problem = checkMediaFile({ type, size: Number.isFinite(declared) ? declared : 0 });
  if (problem) return Response.json({ error: problem }, { status: 422 });
  const kind = mediaKindOfType(type);
  const limit = kind ? REVIEW_MEDIA[kind].maxBytes : 0;

  try {
    await access(full);
    return Response.json({ error: "Файл уже загружен" }, { status: 409 });
  } catch {
    // файла нет — можно писать
  }

  await mkdir(path.dirname(full), { recursive: true });
  const temp = `${full}.${randomUUID()}.part`;
  let received = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received > limit) callback(new Error("too-large"));
      else callback(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream), counter, createWriteStream(temp));
    await rename(temp, full);
  } catch (error) {
    await rm(temp, { force: true });
    if (error instanceof Error && error.message === "too-large") {
      return Response.json({ error: "Файл слишком большой" }, { status: 413 });
    }
    console.error("[files] upload:", error);
    return Response.json({ error: "Файл не загрузился. Попробуйте ещё раз." }, { status: 500 });
  }
  return Response.json({ ok: true, path: objectPath });
}

