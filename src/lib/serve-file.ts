import "server-only";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { contentTypeFor } from "@/lib/local-files";

/**
 * Отдаёт файл с диска потоком. Поддерживает Range, чтобы видео в отзывах
 * перематывалось и открывалось на iPhone (Safari запрашивает видео кусками).
 */
export async function serveFile(request: Request, full: string, cacheControl: string): Promise<Response> {
  let size: number;
  try {
    const info = await stat(full);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    size = info.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": contentTypeFor(full),
    "Cache-Control": cacheControl,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };

  const range = request.headers.get("range");
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (match && (match[1] || match[2])) {
    let start: number;
    let end: number;
    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    } else {
      // «bytes=-500» — последние 500 байт
      start = Math.max(0, size - Number(match[2]));
      end = size - 1;
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  if (request.method === "HEAD") return new Response(null, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
  const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
  return new Response(stream, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
}
