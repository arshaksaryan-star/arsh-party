import "server-only";
import { cache } from "react";
import { defaultDirections, EDITABLE_DIRECTION_KEYS, type Direction, type DirectionSlug } from "@/content/directions";
import { defaultDirectionPages, mergeDirectionPage, type DirectionPage } from "@/content/direction-pages";
import { defaultSite, EDITABLE_SITE_FIELDS, type SiteConfig } from "@/content/site";
import { mergePhotos, type Photos } from "@/content/photos";
import { parseReviewsContent, type ReviewsContent } from "@/content/reviews";
import { isSupabaseConfigured, selectRows, type ReadCache } from "@/lib/supabase";

/**
 * Контент сайта = значения по умолчанию из src/content + правки из админки.
 *
 * Правки лежат в таблице Supabase `content` двумя строками:
 *   key = "site"       → { phone: "...", hours: "...", ... }
 *   key = "directions" → { sshp: { tagline: "...", tags: [...], page: { lead, included, formats, steps, faq } }, ... }
 *
 * Сайт читает их с кэшем и тегом CONTENT_TAG. Админка после сохранения
 * сбрасывает тег, и правка видна посетителям сразу, без пересборки.
 */

export const CONTENT_TAG = "content";

/** Видео-кружок: приветствие на главной или «объясняю за минуту» на странице звезды. */
export type Circle = { video: string; poster: string | null; /** Скрыт с сайта, но видео сохранено. */ hidden: boolean };
export type CircleSlot = "greeting" | DirectionSlug;
export const CIRCLE_SLOTS: readonly CircleSlot[] = ["greeting", ...defaultDirections.map((direction) => direction.slug)];

export type Content = {
  site: SiteConfig;
  directions: Direction[];
  /** Тексты страниц пяти звёзд. */
  pages: Record<DirectionSlug, DirectionPage>;
  /** Видео-кружки (строка content key = "circles"). */
  circles: Partial<Record<CircleSlot, Circle>>;
  /** Фото Арша: загруженные в админке или файлы по умолчанию (key = "photos"). */
  photos: Photos;
  /** Оценки площадок и отзывы с Яндекса и 2ГИС (key = "reviews"). */
  reviews: ReviewsContent;
};

export type SiteOverrides = Partial<Record<(typeof EDITABLE_SITE_FIELDS)[number]["key"], string | null>>;
export type DirectionOverrides = Partial<Record<DirectionSlug, Partial<Pick<Direction, "title" | "short" | "tagline" | "cta"> & { tags: string[] }>>>;

type ContentRow = { key: string; data: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Накладывает правки на значения по умолчанию, отбрасывая всё лишнее и битое. */
function parseCircles(data: unknown): Partial<Record<CircleSlot, Circle>> {
  const result: Partial<Record<CircleSlot, Circle>> = {};
  if (!isRecord(data)) return result;
  for (const slot of CIRCLE_SLOTS) {
    const item = data[slot];
    if (isRecord(item) && typeof item.video === "string" && item.video) {
      result[slot] = { video: item.video, poster: typeof item.poster === "string" ? item.poster : null, hidden: item.hidden === true };
    }
  }
  return result;
}

export function mergeContent(siteData: unknown, directionsData: unknown, circlesData?: unknown, photosData?: unknown, reviewsData?: unknown): Content {
  const site: SiteConfig = { ...defaultSite };
  if (isRecord(siteData)) {
    for (const field of EDITABLE_SITE_FIELDS) {
      const value = siteData[field.key];
      if (value === null || typeof value === "string") {
        // Пустая строка из формы означает «не показывать».
        (site as Record<string, unknown>)[field.key] = value === "" ? null : value;
      }
    }
    // Эти поля не могут быть пустыми: без них ломается вёрстка.
    for (const required of ["heroLead", "region", "description"] as const) {
      if (!site[required]) site[required] = defaultSite[required];
    }
  }

  const directions = defaultDirections.map((direction) => {
    const patch = isRecord(directionsData) ? directionsData[direction.slug] : undefined;
    if (!isRecord(patch)) return { ...direction };
    const merged: Direction = { ...direction };
    for (const key of EDITABLE_DIRECTION_KEYS) {
      const value = patch[key];
      if (key === "tags") {
        if (Array.isArray(value)) merged.tags = value.filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "");
      } else if (typeof value === "string" && value.trim() !== "") {
        merged[key] = value.trim();
      }
    }
    return merged;
  });

  const pages = Object.fromEntries(
    defaultDirections.map((direction) => {
      const patch = isRecord(directionsData) ? directionsData[direction.slug] : undefined;
      const base = defaultDirectionPages[direction.slug];
      return [direction.slug, mergeDirectionPage(base, isRecord(patch) ? patch.page : undefined)];
    }),
  ) as Record<DirectionSlug, DirectionPage>;

  const photos = mergePhotos(photosData);
  // Фото ведущего из админки — и в карточке на главной, и на странице /host.
  const withPhotos = directions.map((direction) =>
    direction.slug === "host" && direction.visual.kind === "photo" ? { ...direction, visual: { ...direction.visual, src: photos.host } } : direction,
  );

  return { site, directions: withPhotos, pages, circles: parseCircles(circlesData), photos, reviews: parseReviewsContent(reviewsData) };
}

export async function loadContent(readCache: ReadCache): Promise<Content> {
  if (!isSupabaseConfigured()) return mergeContent(null, null);
  try {
    const rows = await selectRows<ContentRow>("content", "?select=key,data&key=in.(site,directions,circles,photos,reviews)", readCache);
    const byKey = new Map(rows.map((row) => [row.key, row.data]));
    return mergeContent(byKey.get("site"), byKey.get("directions"), byKey.get("circles"), byKey.get("photos"), byKey.get("reviews"));
  } catch (error) {
    // База недоступна — сайт работает на значениях по умолчанию.
    console.error("[content]", error);
    return mergeContent(null, null);
  }
}

/** Для страниц сайта: один запрос на рендер, кэш 5 минут или до сохранения в админке. */
export const getContent = cache(() => loadContent({ revalidate: 300, tags: [CONTENT_TAG] }));
