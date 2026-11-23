/**
 * Праздники — архив мероприятий для страницы /prazdniki и блока «Как это было».
 * Один код для сайта, админки и проверок.
 */

import type { DirectionSlug } from "@/content/directions";

export const EVENTS_TAG = "events";
export const MAX_EVENT_PHOTOS = 30;
export const MAX_EVENT_VIDEOS = 5;

export type EventRow = {
  id: string;
  title: string;
  direction: DirectionSlug;
  /** ГГГГ-ММ-ДД или null, если дата не важна. */
  event_date: string | null;
  place: string | null;
  summary: string | null;
  quote: string | null;
  quote_author: string | null;
  cover_url: string | null;
  photos: string[] | null;
  /** Адреса встроенного плеера VK Видео (video_ext.php). */
  videos: string[] | null;
  is_published: boolean;
  created_at: string;
};

const DIRECTIONS: readonly DirectionSlug[] = ["mangal", "sshp", "catering", "events", "host"];

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

/** «Июль 2026». */
export function formatEventDate(iso: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month] = iso.split("-").map(Number);
  const name = MONTHS[month - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
}

/**
 * Ссылка на ролик VK Видео → адрес встроенного плеера.
 * Понимает: vk.com/video-1_2, vkvideo.ru/video-1_2, vk.com/clip-1_2, ссылку с ?z=video-1_2,
 * готовый код вставки <iframe src="…video_ext.php?…"> (из «Поделиться → Экспортировать»; в нём есть hash для закрытых роликов).
 * Чужие адреса не пропускает — на сайт встраивается только VK.
 */
export function vkEmbedUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const src = /src\s*=\s*["']([^"']+)["']/i.exec(raw)?.[1] ?? raw;
  let url: URL;
  try {
    url = new URL(src.replace(/&amp;/g, "&"));
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  if (!["vk.com", "vkvideo.ru", "vk.ru"].includes(host)) return null;

  if (url.pathname.endsWith("/video_ext.php")) {
    const oid = url.searchParams.get("oid");
    const id = url.searchParams.get("id");
    if (!oid || !id || !/^-?\d+$/.test(oid) || !/^\d+$/.test(id)) return null;
    const hash = url.searchParams.get("hash");
    return buildEmbed(oid, id, hash && /^[0-9a-f]+$/i.test(hash) ? hash : null);
  }

  let search = url.search;
  try {
    search = decodeURIComponent(search);
  } catch {
    // битая кодировка — ищем в исходной строке
  }
  const match = /(?:video|clip)(-?\d+)_(\d+)/.exec(`${url.pathname}${search}`);
  if (!match) return null;
  return buildEmbed(match[1], match[2], null);
}

function buildEmbed(oid: string, id: string, hash: string | null): string {
  const params = new URLSearchParams({ oid, id, hd: "2" });
  if (hash) params.set("hash", hash);
  return `https://vk.com/video_ext.php?${params.toString()}`;
}

export type EventInput = {
  title: string;
  direction: DirectionSlug;
  event_date: string | null;
  place: string | null;
  summary: string | null;
  quote: string | null;
  quote_author: string | null;
  videos: string[];
  is_published: boolean;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

export function validateEvent(raw: Record<string, unknown>): { ok: true; event: EventInput } | { ok: false; error: string } {
  const title = text(raw.title);
  if (title.length < 2 || title.length > 120) return { ok: false, error: "Название — от 2 до 120 символов" };

  const direction = text(raw.direction) as DirectionSlug;
  if (!DIRECTIONS.includes(direction)) return { ok: false, error: "Выберите звезду направления" };

  const date = text(raw.event_date);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Дата — в формате ГГГГ-ММ-ДД" };

  const place = text(raw.place);
  const summary = text(raw.summary);
  const quote = text(raw.quote);
  const quoteAuthor = text(raw.quote_author);
  if (place.length > 120) return { ok: false, error: "Место — до 120 символов" };
  if (summary.length > 600) return { ok: false, error: "Описание — до 600 символов" };
  if (quote.length > 400) return { ok: false, error: "Цитата из отзыва — до 400 символов" };
  if (quoteAuthor.length > 80) return { ok: false, error: "Автор цитаты — до 80 символов" };

  const videoLines = text(raw.videos)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (videoLines.length > MAX_EVENT_VIDEOS) return { ok: false, error: `Видео — не больше ${MAX_EVENT_VIDEOS}` };
  const videos: string[] = [];
  for (const line of videoLines) {
    const embed = vkEmbedUrl(line);
    if (!embed) return { ok: false, error: `Не получилось распознать ссылку VK Видео: «${line.slice(0, 60)}»` };
    videos.push(embed);
  }

  return {
    ok: true,
    event: {
      title,
      direction,
      event_date: date || null,
      place: place || null,
      summary: summary || null,
      quote: quote || null,
      quote_author: quoteAuthor || null,
      videos,
      is_published: raw.is_published === "on" || raw.is_published === true,
    },
  };
}

/** Для показа в админке: адрес плеера → ссылка, которую поймёт человек. */
export function vkWatchUrl(embed: string): string {
  try {
    const url = new URL(embed);
    return `https://vkvideo.ru/video${url.searchParams.get("oid")}_${url.searchParams.get("id")}`;
  } catch {
    return embed;
  }
}
