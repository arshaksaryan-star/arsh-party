import { formatReviewDate, getPlatform, type Review, type ReviewPlatform } from "@/content/reviews";
import { getContent } from "@/lib/content";
import { loadPublishedSiteReviews } from "@/lib/site-reviews-data";
import { ReviewsViewport } from "./ReviewsViewport";
import styles from "./Reviews.module.css";

function ReviewCard({ review, platforms }: { review: Review; platforms: readonly ReviewPlatform[] }) {
  const platform = review.platform === "site" ? null : getPlatform(review.platform, platforms);
  return (
    // tabIndex: на телефоне карточка компактная, касание раскрывает весь текст
    <article className={styles.card} tabIndex={0}>
      {review.rating ? (
        <p className={styles.stars} aria-label={`Оценка ${review.rating} из 5`}>
          {"★".repeat(Math.round(review.rating))}
        </p>
      ) : null}
      <p className={styles.text}>{review.text}</p>
      {review.media && review.media.length > 0 ? (
        <div className={styles.media}>
          {review.media.map((item) => (
            <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className={styles.mediaItem} aria-label={item.kind === "video" ? "Открыть видео" : "Открыть фото"}>
              {item.kind === "video" ? (
                <>
                  <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline className={styles.mediaThumb} />
                  <span className={styles.play} aria-hidden="true">▶</span>
                </>
              ) : (
                <img src={item.url} alt="Фото к отзыву" loading="lazy" className={styles.mediaThumb} />
              )}
            </a>
          ))}
        </div>
      ) : null}
      <footer className={styles.meta}>
        <span className={styles.author}>{review.author}</span>
        <span className={styles.source}>
          {formatReviewDate(review.date)} ·{" "}
          {platform ? (
            <a href={platform.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
              {platform.name}
            </a>
          ) : (
            "на сайте"
          )}
        </span>
      </footer>
    </article>
  );
}

export async function Reviews() {
  // Отзывы с площадок и опубликованные отзывы с сайта — одной лентой, свежие первыми.
  // Отзывы с площадок и оценки — из админки → «Отзывы» (или значения по умолчанию из кода).
  const [siteReviews, { reviews: platformContent }] = await Promise.all([loadPublishedSiteReviews(), getContent()]);
  const reviewPlatforms = platformContent.platforms;
  const all = [...siteReviews, ...platformContent.items].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className={styles.section} aria-labelledby="reviews-title" id="reviews">
      <div className={`container ${styles.head}`}>
        <h2 id="reviews-title" className={styles.heading}>
          Что говорят после
        </h2>
        <ul className={styles.platforms}>
          {reviewPlatforms.map((platform) => (
            <li key={platform.id}>
              <a href={platform.url} target="_blank" rel="noopener noreferrer" className={styles.platform}>
                <span className={styles.platformRating}>{platform.rating.toLocaleString("ru-RU")}</span>
                <span className={styles.platformText}>
                  <b>{platform.name}</b>
                  <span>{platform.ratingsLabel} · все отзывы ↗</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Две одинаковые дорожки дают бесконечную ленту; вторая скрыта от скринридеров */}
      <ReviewsViewport className={styles.viewport}>
        <div className={styles.track}>
          <div className={styles.lane}>
            {all.map((review, index) => (
              <ReviewCard key={`${review.platform}-${review.author}-${review.date}-${index}`} review={review} platforms={reviewPlatforms} />
            ))}
          </div>
          <div className={`${styles.lane} ${styles.clone}`} aria-hidden="true" inert>
            {all.map((review, index) => (
              <ReviewCard key={`clone-${review.platform}-${review.author}-${review.date}-${index}`} review={review} platforms={reviewPlatforms} />
            ))}
          </div>
        </div>
      </ReviewsViewport>
    </section>
  );
}
