import "server-only";
import type { Review } from "@/content/reviews";
import { publicName, type SiteReviewRow } from "@/lib/site-review";
import { createSignedUrls, isSupabaseConfigured, REVIEW_BUCKET, selectRows } from "@/lib/supabase";

export const SITE_REVIEWS_TAG = "site-reviews";

/** Опубликованные отзывы с сайта для ленты на главной. Без базы — пустой список. */
export async function loadPublishedSiteReviews(): Promise<Review[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const rows = await selectRows<SiteReviewRow>(
      "site_reviews",
      "?select=id,name,rating,text,media,created_at,published_at&status=eq.published&order=created_at.desc&limit=30",
      { revalidate: 300, tags: [SITE_REVIEWS_TAG] },
    );
    // Файлы лежат в закрытом хранилище: для ленты делаем ссылки на сутки (страница обновляется чаще).
    const paths = rows.flatMap((row) => (row.media ?? []).map((item) => item.path));
    const urls = await createSignedUrls(REVIEW_BUCKET, paths, 60 * 60 * 24).catch((error) => {
      console.error("[reviews] sign media:", error);
      return new Map<string, string>();
    });
    return rows.map((row) => ({
      author: publicName(row.name),
      date: row.created_at.slice(0, 10),
      platform: "site",
      rating: row.rating,
      text: row.text,
      media: (row.media ?? [])
        .map((item) => ({ kind: item.kind, url: urls.get(item.path) ?? "" }))
        .filter((item) => item.url),
    }));
  } catch (error) {
    console.error("[reviews] site_reviews:", error);
    return [];
  }
}
