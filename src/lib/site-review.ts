/**
 * Отзыв, оставленный на сайте: поля и проверка.
 * Один код для браузера (подсказки в форме) и сервера (/api/review).
 */

export const REVIEW_LIMITS = { nameMin: 2, nameMax: 60, textMin: 10, textMax: 1500 } as const;
/** Быстрее заполнить форму человек не успевает: так отсеиваются простые боты. */
export const REVIEW_MIN_FILL_MS = 3000;

/* ───── Фото и видео ───── */

export const REVIEW_MEDIA = {
  maxFiles: 3,
  image: { maxBytes: 10 * 1024 * 1024, types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } },
  video: { maxBytes: 50 * 1024 * 1024, types: { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" } },
} as const;

export const REVIEW_MEDIA_ACCEPT = [
  ...Object.keys(REVIEW_MEDIA.image.types),
  ...Object.keys(REVIEW_MEDIA.video.types),
].join(",");

export type MediaKind = "image" | "video";
export type ReviewMedia = { path: string; kind: MediaKind };

/** Проверка файла до загрузки: тип и размер. Возвращает текст ошибки или null. */
export function checkMediaFile(file: { type: string; size: number }): string | null {
  const kind = mediaKindOfType(file.type);
  if (!kind) return "Подойдут фото JPG, PNG, WebP или видео MP4, MOV, WebM";
  const limit = REVIEW_MEDIA[kind].maxBytes;
  if (file.size > limit) return `${kind === "image" ? "Фото" : "Видео"} больше ${Math.round(limit / 1024 / 1024)} МБ`;
  return null;
}

export function mediaKindOfType(type: string): MediaKind | null {
  if (type in REVIEW_MEDIA.image.types) return "image";
  if (type in REVIEW_MEDIA.video.types) return "video";
  return null;
}

export function mediaExtension(type: string): string | null {
  const kind = mediaKindOfType(type);
  if (!kind) return null;
  return (REVIEW_MEDIA[kind].types as Record<string, string>)[type];
}

const MEDIA_PATH = /^pending\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|mov|webm)$/;

/** Пути файлов из формы: только те, что выдал наш сервер. */
export function parseMedia(raw: unknown): ReviewMedia[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > REVIEW_MEDIA.maxFiles) return null;
  const result: ReviewMedia[] = [];
  for (const item of raw) {
    const path = typeof item === "string" ? item : null;
    const match = path ? MEDIA_PATH.exec(path) : null;
    if (!path || !match) return null;
    result.push({ path, kind: ["mp4", "mov", "webm"].includes(match[1]) ? "video" : "image" });
  }
  return result;
}

export type SiteReviewInput = {
  name: string;
  rating: number;
  text: string;
  consent: boolean;
  media: ReviewMedia[];
};

export type SiteReviewErrors = Partial<Record<keyof SiteReviewInput, string>>;

export type SiteReviewStatus = "new" | "published" | "hidden";

export type SiteReviewRow = {
  id: string;
  number: number;
  name: string;
  rating: number;
  text: string;
  status: SiteReviewStatus;
  media: ReviewMedia[] | null;
  created_at: string;
  published_at: string | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function validateSiteReview(raw: Record<string, unknown>):
  | { ok: true; review: SiteReviewInput }
  | { ok: false; errors: SiteReviewErrors } {
  const errors: SiteReviewErrors = {};
  const name = text(raw.name);
  // В тексте отзыва сохраняем переносы строк, убираем только лишние пробелы по краям.
  const body = typeof raw.text === "string" ? raw.text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";
  const rating = Number(raw.rating);
  const consent = raw.consent === true;

  if (name.length < REVIEW_LIMITS.nameMin) errors.name = "Как вас подписать? Хотя бы имя";
  else if (name.length > REVIEW_LIMITS.nameMax) errors.name = `Не длиннее ${REVIEW_LIMITS.nameMax} символов`;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = "Поставьте оценку: от 1 до 5 звёзд";

  if (body.length < REVIEW_LIMITS.textMin) errors.text = "Напишите хотя бы пару слов";
  else if (body.length > REVIEW_LIMITS.textMax) errors.text = `Не длиннее ${REVIEW_LIMITS.textMax} символов`;

  if (!consent) errors.consent = "Нужно согласие на публикацию";

  const media = parseMedia(raw.media);
  if (!media) errors.media = "Не получилось прикрепить файлы. Выберите их заново";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, review: { name, rating, text: body, consent, media: media ?? [] } };
}

/** Имя для публикации: «Анна Петрова» → «Анна П.» */
export function publicName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}
