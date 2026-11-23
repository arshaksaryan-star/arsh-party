import { diskPath, usesLocalFiles, verifySignature } from "@/lib/local-files";
import { serveFile } from "@/lib/serve-file";

/** Закрытые файлы (фото и видео к отзывам) — только по подписанной ссылке с ограниченным сроком. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!usesLocalFiles()) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const bucket = url.searchParams.get("b") ?? "";
  const objectPath = url.searchParams.get("p") ?? "";
  const expires = Number(url.searchParams.get("e"));
  const signature = url.searchParams.get("s") ?? "";
  if (!verifySignature("get", bucket, objectPath, expires, signature)) return new Response("Forbidden", { status: 403 });
  const full = diskPath(bucket, objectPath);
  if (!full) return new Response("Not found", { status: 404 });
  return serveFile(request, full, "private, max-age=3600");
}

export const HEAD = GET;
