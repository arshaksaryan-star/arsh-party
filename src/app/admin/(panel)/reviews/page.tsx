import { PlatformReviews, type EditableReview } from "@/components/admin/PlatformReviews";
import { ReviewsModeration } from "@/components/admin/ReviewsModeration";
import { defaultReviewItems, parseReviewsContent } from "@/content/reviews";
import type { SiteReviewRow } from "@/lib/site-review";
import { createSignedUrls, isSupabaseConfigured, REVIEW_BUCKET, selectRows } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

async function loadReviews(): Promise<{ rows: SiteReviewRow[]; media: Record<string, string>; error: boolean }> {
  if (!isSupabaseConfigured()) return { rows: [], media: {}, error: false };
  try {
    const rows = await selectRows<SiteReviewRow>("site_reviews", "?select=*&order=created_at.desc&limit=200", "no-store");
    // Ссылки на файлы живут час — этого хватает, чтобы посмотреть и решить.
    const paths = rows.flatMap((row) => (row.media ?? []).map((item) => item.path));
    const urls = await createSignedUrls(REVIEW_BUCKET, paths, 60 * 60).catch((error) => {
      console.error("[admin] sign media", error);
      return new Map<string, string>();
    });
    return { rows, media: Object.fromEntries(urls), error: false };
  } catch (error) {
    console.error("[admin] site_reviews", error);
    return { rows: [], media: {}, error: true };
  }
}

/** Отзывы с Яндекса и 2ГИС: из базы (вместе со скрытыми) или из кода, если ещё не правили. */
async function loadPlatformReviews() {
  let data: Record<string, unknown> | null = null;
  if (isSupabaseConfigured()) {
    try {
      const [row] = await selectRows<{ data: Record<string, unknown> | null }>("content", "?select=data&key=eq.reviews", "no-store");
      data = row?.data ?? null;
    } catch (problem) {
      console.error("[admin] platform reviews", problem);
    }
  }
  const { platforms } = parseReviewsContent(data);
  const stored = data?.items;
  const source = (Array.isArray(stored) ? stored : defaultReviewItems()) as unknown as Record<string, unknown>[];
  const reviews: EditableReview[] = source
    .map((item) => ({
      id: String(item.id ?? ""),
      author: String(item.author ?? ""),
      date: String(item.date ?? ""),
      platform: item.platform === "2gis" ? ("2gis" as const) : ("yandex" as const),
      rating: typeof item.rating === "number" ? item.rating : null,
      text: String(item.text ?? ""),
      directions: Array.isArray(item.directions) ? item.directions.map(String) : [],
      hidden: item.hidden === true,
    }))
    .filter((item) => item.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  return { platforms, reviews };
}

export default async function AdminReviewsPage() {
  const [{ rows, media, error }, platformReviews] = await Promise.all([loadReviews(), loadPlatformReviews()]);
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Отзывы с сайта</h1>
        <p className={styles.pageHint}>
          Отзывы со страницы /otziv. Новый отзыв не виден на сайте, пока вы его не опубликуете. Опубликованные отзывы
          появляются в ленте «Что говорят после» на главной с пометкой «на сайте».
        </p>
      </div>
      {error ? (
        <p className={styles.notice}>
          Не удалось загрузить отзывы. Проверьте, что в Supabase выполнен файл <code>supabase/2026-11-09-site-reviews.sql</code>.
        </p>
      ) : null}
      <ReviewsModeration rows={rows} media={media} disabled={!isSupabaseConfigured()} />

      <div className={styles.pageHead} style={{ marginTop: 32 }}>
        <h2 className={styles.pageTitle} style={{ fontSize: 26 }}>
          Отзывы с Яндекса и 2ГИС
        </h2>
        <p className={styles.pageHint}>
          Эти отзывы идут в ленту на главной и на страницы звёзд. Переносите дословно, с площадки, — придумывать и править текст
          клиента нельзя.
        </p>
      </div>
      <PlatformReviews platforms={platformReviews.platforms} reviews={platformReviews.reviews} disabled={!isSupabaseConfigured()} />
    </>
  );
}
