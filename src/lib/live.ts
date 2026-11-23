import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

/**
 * Arsh Live: свежие видео-кружочки из Telegram-канала Арша.
 * Берём публичную страницу t.me/s/<канал> (через посредника, если сервер в России),
 * находим кружочки за последние 7 дней, скачиваем на свой диск и показываем на главной.
 */

const run = promisify(execFile);
const FRESH_DAYS = 7;
const KEEP_FILES = 6;

export type LiveCircle = {
  /** Адрес видео на нашем сайте (или на CDN Telegram, если хранилища нет). */
  video: string;
  poster: string | null;
  /** Ссылка на пост в канале. */
  postUrl: string;
  date: string;
};

/** «https://t.me/arshlive» → «arshlive». */
export function channelFromUrl(url: string | null): string | null {
  const match = url?.match(/^https:\/\/t\.me\/(?:s\/)?([A-Za-z0-9_]{4,64})\/?$/);
  return match ? match[1] : null;
}

function proxyBase(): string | null {
  const base = process.env.TELEGRAM_API_BASE;
  return base ? base.replace(/\/+$/, "") : null;
}

type RawCircle = { post: string; date: string; video: string; poster: string | null };

/** Разбор страницы канала: только кружочки (video notes). */
export function parseCircles(html: string): RawCircle[] {
  const blocks = html.split('class="tgme_widget_message_wrap').slice(1);
  const result: RawCircle[] = [];
  for (const block of blocks) {
    if (!block.includes("roundvideo")) continue;
    const post = block.match(/data-post="([^"]+)"/)?.[1];
    const date = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
    const video =
      block.match(/<video[^>]*class="[^"]*roundvideo[^"]*"[^>]*src="([^"]+)"/)?.[1] ??
      block.match(/<video[^>]*src="([^"]+)"[^>]*class="[^"]*roundvideo/)?.[1] ??
      null;
    const poster = block.match(/roundvideo_thumb[^>]*background-image:url\('([^']+)'\)/)?.[1] ?? null;
    if (post && date && video) result.push({ post, date, video: video.replace(/&amp;/g, "&"), poster: poster?.replace(/&amp;/g, "&") ?? null });
  }
  return result.reverse(); // на странице от старых к новым
}

async function download(url: string, target: string): Promise<boolean> {
  const proxy = proxyBase();
  const source = proxy ? `${proxy}/img?u=${encodeURIComponent(url)}` : url;
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(30000), cache: "no-store" });
    if (!response.ok) return false;
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    return true;
  } catch (error) {
    console.error("[live] download", error);
    return false;
  }
}

/** Оставляем только последние файлы, чтобы диск не забивался. */
async function cleanup(dir: string): Promise<void> {
  try {
    const files = await readdir(dir);
    const withTime = await Promise.all(files.map(async (name) => ({ name, time: (await stat(path.join(dir, name))).mtimeMs })));
    withTime.sort((a, b) => b.time - a.time);
    await Promise.all(withTime.slice(KEEP_FILES * 2).map((file) => rm(path.join(dir, file.name), { force: true })));
  } catch {
    // папки ещё нет — нечего чистить
  }
}

/** Самые свежие кружочки канала за 7 дней (новые первыми). Ошибка — пустой список, сайт не падает. */
export async function loadLiveCircles(channelUrl: string | null, limit = 1): Promise<LiveCircle[]> {
  const channel = channelFromUrl(channelUrl);
  if (!channel) return [];
  let html: string;
  try {
    const response = await fetch(`${proxyBase() ?? "https://t.me"}/s/${channel}`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 900, tags: ["live"] },
    });
    if (!response.ok) return [];
    html = await response.text();
  } catch (error) {
    console.error("[live] channel", error);
    return [];
  }

  const since = Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000;
  const fresh = parseCircles(html)
    .filter((circle) => Date.parse(circle.date) >= since)
    .slice(0, limit);

  const storage = process.env.STORAGE_DIR;
  const result: LiveCircle[] = [];
  for (const circle of fresh) {
    const postUrl = `https://t.me/${circle.post}`;
    if (!storage) {
      // Разработка на компьютере: показываем прямо с CDN Telegram.
      result.push({ video: circle.video, poster: circle.poster, postUrl, date: circle.date });
      continue;
    }
    const name = circle.post.replace(/[^A-Za-z0-9_]/g, "-");
    const dir = path.join(path.resolve(storage), "media", "live", "channel");
    const videoFile = path.join(dir, `${name}.mp4`);
    const posterFile = path.join(dir, `${name}.jpg`);
    if (!existsSync(videoFile) && !(await download(circle.video, videoFile))) continue;
    if (circle.poster && !existsSync(posterFile)) await download(circle.poster, posterFile);
    result.push({
      video: `/files/media/live/channel/${name}.mp4`,
      poster: existsSync(posterFile) ? `/files/media/live/channel/${name}.jpg` : null,
      postUrl,
      date: circle.date,
    });
  }
  if (storage) await cleanup(path.join(path.resolve(storage), "media", "live", "channel"));
  return result;
}

/**
 * Приводим загруженное видео к кружочку: квадрат 640×640, H.264 + AAC, до 60 секунд,
 * быстрый старт в браузере. Нет ffmpeg на сервере — возвращаем false, файл остаётся как есть.
 */
export async function makeCircle(input: string, output: string, poster: string): Promise<boolean> {
  try {
    await run(
      "ffmpeg",
      [
        "-y", "-i", input, "-t", "60",
        "-vf", "crop='min(iw,ih)':'min(iw,ih)',scale=640:640,format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
        output,
      ],
      { timeout: 180000 },
    );
    await run("ffmpeg", ["-y", "-ss", "0.3", "-i", output, "-frames:v", "1", "-q:v", "4", poster], { timeout: 30000 }).catch(() => undefined);
    return true;
  } catch (error) {
    console.error("[live] ffmpeg", error instanceof Error ? error.message.slice(0, 300) : error);
    return false;
  }
}
