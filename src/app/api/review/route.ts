import { NextResponse } from "next/server";
import { REVIEW_MIN_FILL_MS, validateSiteReview } from "@/lib/site-review";
import { insertRow, isSupabaseConfigured, updateRow } from "@/lib/supabase";
import { escapeHtml, isNotifyConfigured, notifyOwner } from "@/lib/notify";

/**
 * Приём отзыва со страницы /otziv.
 * Отзыв сохраняется в Supabase со статусом «new» и ждёт модерации в админке.
 * Владелец получает уведомление в Telegram и VK (что подключено).
 */

type Saved = { id: string; number: number };

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать отзыв. Обновите страницу и попробуйте ещё раз." }, { status: 400 });
  }

  // Ловушки для ботов: скрытое поле и слишком быстрая отправка. Отвечаем «ок» и ничего не сохраняем.
  const startedAt = Number(body.startedAt);
  if ((typeof body.website === "string" && body.website.trim() !== "") || (startedAt && Date.now() - startedAt < REVIEW_MIN_FILL_MS)) {
    return NextResponse.json({ ok: true });
  }

  const result = validateSiteReview(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });
  const review = result.review;

  if (!isSupabaseConfigured()) {
    console.error("[review] Supabase не настроен — отзыв некуда сохранить");
    return NextResponse.json({ error: "Отзывы на сайте временно не принимаются. Оставьте, пожалуйста, отзыв на площадке выше." }, { status: 503 });
  }

  let saved: Saved;
  try {
    saved = await insertRow<Saved>("site_reviews", {
      name: review.name,
      rating: review.rating,
      text: review.text,
      media: review.media,
    });
  } catch (error) {
    console.error("[review] Supabase:", error);
    return NextResponse.json({ error: "Не получилось сохранить отзыв. Попробуйте ещё раз через минуту." }, { status: 502 });
  }

  if (isNotifyConfigured()) {
    try {
      await notifyOwner(
        [
          `⭐ <b>Новый отзыв на сайте №${saved.number}</b>`,
          `${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`,
          "",
          `<b>${escapeHtml(review.name)}</b>`,
          escapeHtml(review.text),
          ...(review.media.length > 0 ? ["", `📎 Файлов: ${review.media.length} — смотреть в админке`] : []),
          "",
          "Опубликовать: админка → «Отзывы»",
        ].join("\n"),
      );
      await updateRow("site_reviews", saved.id, { telegram_sent: true });
    } catch (error) {
      console.error("[review] notify:", error);
    }
  }

  return NextResponse.json({ ok: true });
}
