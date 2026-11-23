/**
 * Картинки постов Telegram-канала для ленты на сайте.
 * Посетители из России не всегда видят CDN Telegram, поэтому сервер забирает картинку
 * через посредника (TELEGRAM_API_BASE + /img) и отдаёт её сам. Только CDN Telegram.
 */
const ALLOWED_HOST = /^cdn\d*\.(telesco\.pe|cdn-telegram\.org)$/;

export async function GET(request: Request) {
  const base = process.env.TELEGRAM_API_BASE?.replace(/\/+$/, "");
  const raw = new URL(request.url).searchParams.get("u") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!base || target.protocol !== "https:" || !ALLOWED_HOST.test(target.hostname)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const response = await fetch(`${base}/img?u=${encodeURIComponent(target.toString())}`, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.startsWith("image/")) return new Response("Not found", { status: 404 });
    return new Response(await response.arrayBuffer(), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
