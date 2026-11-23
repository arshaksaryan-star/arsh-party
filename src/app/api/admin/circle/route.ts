import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-session";
import { CIRCLE_SLOTS, CONTENT_TAG, type CircleSlot } from "@/lib/content";
import { makeCircle } from "@/lib/live";
import { usesLocalFiles } from "@/lib/local-files";
import { deletePublicFile, isSupabaseConfigured, selectRows, uploadPublicFile, upsertRow } from "@/lib/supabase";

/**
 * Видео-кружки Арша: ?slot=greeting — приветствие на главной, ?slot=sshp (и другие звёзды) —
 * «объясняю за минуту» на странице направления. Хранятся в таблице content, key = "circles".
 * PUT — загрузить новое (старое удаляется), DELETE — убрать.
 * На своём сервере видео приводится к кружочку через ffmpeg: квадрат 640×640, до 60 секунд.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES = 300 * 1024 * 1024;
const TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

type Row = { key: string; data: Record<string, unknown> | null };

async function readCircles(): Promise<Record<string, unknown>> {
  const rows = await selectRows<Row>("content", "?select=key,data&key=eq.circles", "no-store");
  return rows[0]?.data ?? {};
}

function slotFrom(request: Request): CircleSlot | null {
  const slot = new URL(request.url).searchParams.get("slot") ?? "";
  return (CIRCLE_SLOTS as readonly string[]).includes(slot) ? (slot as CircleSlot) : null;
}

async function writeVideo(slot: CircleSlot, video: string | null, poster: string | null) {
  const data = await readCircles();
  const old = data[slot] as { video?: unknown; poster?: unknown } | undefined;
  const previous = [old?.video, old?.poster].filter((value): value is string => typeof value === "string");
  const next = { ...data };
  if (video) next[slot] = { video, poster, hidden: false };
  else delete next[slot];
  await upsertRow("content", { key: "circles", data: next, updated_at: new Date().toISOString() });
  for (const url of previous) if (url !== video && url !== poster) await deletePublicFile(url).catch(() => undefined);
  revalidateTag(CONTENT_TAG);
  revalidatePath("/", "layout");
}

async function check(): Promise<Response | null> {
  if (!(await isAdmin())) return Response.json({ error: "Сессия закончилась. Обновите страницу и войдите снова." }, { status: 401 });
  if (!isSupabaseConfigured()) return Response.json({ error: "База не подключена" }, { status: 503 });
  return null;
}

export async function PUT(request: Request) {
  const blocked = await check();
  if (blocked) return blocked;
  const slot = slotFrom(request);
  if (!slot) return Response.json({ error: "Неизвестный кружок" }, { status: 400 });

  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const extension = TYPES[type];
  if (!extension) return Response.json({ error: "Нужно видео: mp4, mov или webm" }, { status: 422 });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) return Response.json({ error: "Видео больше 300 МБ — запишите покороче" }, { status: 413 });
  if (!request.body) return Response.json({ error: "Нет файла" }, { status: 400 });

  const work = path.join(tmpdir(), `live-${randomUUID()}`);
  await mkdir(work, { recursive: true });
  const raw = path.join(work, `in.${extension}`);
  let received = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      callback(received > MAX_BYTES ? new Error("too-large") : null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream), counter, createWriteStream(raw));

    const stamp = Date.now();
    let videoBuffer: Buffer;
    let videoExt = extension;
    let videoType = type;
    let posterBuffer: Buffer | null = null;

    const out = path.join(work, "circle.mp4");
    const poster = path.join(work, "circle.jpg");
    if (usesLocalFiles() && (await makeCircle(raw, out, poster))) {
      videoBuffer = await readFile(out);
      videoExt = "mp4";
      videoType = "video/mp4";
      posterBuffer = await readFile(poster).catch(() => null);
    } else {
      videoBuffer = await readFile(raw);
    }

    const toArrayBuffer = (buffer: Buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const videoUrl = await uploadPublicFile(`live/${slot}-${stamp}.${videoExt}`, toArrayBuffer(videoBuffer), videoType);
    const posterUrl = posterBuffer ? await uploadPublicFile(`live/${slot}-${stamp}.jpg`, toArrayBuffer(posterBuffer), "image/jpeg") : null;

    await writeVideo(slot, videoUrl, posterUrl);
    return Response.json({ ok: true, video: videoUrl, poster: posterUrl, converted: videoExt === "mp4" && posterBuffer !== null });
  } catch (error) {
    if (error instanceof Error && error.message === "too-large") {
      return Response.json({ error: "Видео больше 300 МБ — запишите покороче" }, { status: 413 });
    }
    console.error("[circle] upload", error);
    return Response.json({ error: "Видео не загрузилось. Попробуйте ещё раз." }, { status: 500 });
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** Показать или скрыть кружок, не удаляя видео: ?slot=…&hidden=1|0. */
export async function PATCH(request: Request) {
  const blocked = await check();
  if (blocked) return blocked;
  const slot = slotFrom(request);
  if (!slot) return Response.json({ error: "Неизвестный кружок" }, { status: 400 });
  const hidden = new URL(request.url).searchParams.get("hidden") === "1";
  try {
    const data = await readCircles();
    const item = data[slot];
    if (!item || typeof item !== "object") return Response.json({ error: "Видео ещё не загружено" }, { status: 404 });
    await upsertRow("content", { key: "circles", data: { ...data, [slot]: { ...item, hidden } }, updated_at: new Date().toISOString() });
    revalidateTag(CONTENT_TAG);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, hidden });
  } catch (error) {
    console.error("[circle] toggle", error);
    return Response.json({ error: "Не получилось сохранить" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const blocked = await check();
  if (blocked) return blocked;
  const slot = slotFrom(request);
  if (!slot) return Response.json({ error: "Неизвестный кружок" }, { status: 400 });
  try {
    await writeVideo(slot, null, null);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[circle] delete", error);
    return Response.json({ error: "Не получилось убрать видео" }, { status: 500 });
  }
}
