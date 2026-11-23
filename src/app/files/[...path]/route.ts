import { diskPath, PUBLIC_BUCKET, usesLocalFiles } from "@/lib/local-files";
import { serveFile } from "@/lib/serve-file";

/** Публичные файлы со своего сервера: /files/media/menu/…jpg (фото меню и праздников). */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: Props) {
  if (!usesLocalFiles()) return new Response("Not found", { status: 404 });
  const { path } = await params;
  const [bucket, ...rest] = path;
  if (bucket !== PUBLIC_BUCKET) return new Response("Not found", { status: 404 });
  const full = diskPath(bucket, rest.join("/"));
  if (!full) return new Response("Not found", { status: 404 });
  // Имена файлов уникальны (id и время в имени), поэтому кэшируем надолго.
  return serveFile(request, full, "public, max-age=31536000, immutable");
}

export const HEAD = GET;
