import { deleteSiteReview, setSiteReviewStatus } from "@/app/admin/actions";
import { publicName, type SiteReviewRow, type SiteReviewStatus } from "@/lib/site-review";
import styles from "./admin.module.css";

const STATUS_LABEL: Record<SiteReviewStatus, string> = { new: "Новый", published: "На сайте", hidden: "Скрыт" };
const GROUPS: { status: SiteReviewStatus; title: string }[] = [
  { status: "new", title: "Ждут проверки" },
  { status: "published", title: "Опубликованы" },
  { status: "hidden", title: "Скрыты" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
}

function StatusButton({ id, status, label, disabled }: { id: string; status: SiteReviewStatus; label: string; disabled: boolean }) {
  return (
    <form action={setSiteReviewStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={status === "published" ? styles.primary : styles.secondary} disabled={disabled}>
        {label}
      </button>
    </form>
  );
}

export function ReviewsModeration({ rows, media, disabled }: { rows: SiteReviewRow[]; media: Record<string, string>; disabled: boolean }) {
  if (rows.length === 0) {
    return <p className={styles.empty}>Отзывов с сайта пока нет. Они появятся здесь, когда гости заполнят форму на странице /otziv.</p>;
  }
  return (
    <>
      {GROUPS.map((group) => {
        const list = rows.filter((row) => row.status === group.status);
        if (list.length === 0) return null;
        return (
          <section key={group.status} className={styles.category}>
            <h2 className={styles.categoryTitle}>
              {group.title} · {list.length}
            </h2>
            {list.map((row) => (
              <article key={row.id} className={styles.card}>
                <div className={styles.reviewHead}>
                  <span className={styles.reviewStars} aria-label={`Оценка ${row.rating} из 5`}>
                    {"★".repeat(row.rating)}
                    <span className={styles.reviewStarsOff}>{"★".repeat(5 - row.rating)}</span>
                  </span>
                  <span className={styles.itemMeta}>
                    №{row.number} · {formatDate(row.created_at)} · {STATUS_LABEL[row.status]}
                  </span>
                </div>
                <p className={styles.reviewText}>{row.text}</p>
                {row.media && row.media.length > 0 ? (
                  <div className={styles.reviewMedia}>
                    {row.media.map((item) =>
                      media[item.path] ? (
                        <a key={item.path} href={media[item.path]} target="_blank" rel="noopener noreferrer" className={styles.reviewMediaItem}>
                          {item.kind === "video" ? (
                            <video src={`${media[item.path]}#t=0.1`} preload="metadata" muted playsInline className={styles.thumb} />
                          ) : (
                            <img src={media[item.path]} alt="Фото к отзыву" className={styles.thumb} />
                          )}
                          <span className={styles.itemMeta}>{item.kind === "video" ? "Видео ↗" : "Фото ↗"}</span>
                        </a>
                      ) : (
                        <span key={item.path} className={styles.itemMeta}>
                          Файл не найден
                        </span>
                      ),
                    )}
                  </div>
                ) : null}
                <p className={styles.itemMeta}>
                  {row.name} · на сайте подпись «{publicName(row.name)}»
                </p>
                <div className={styles.inlineActions}>
                  {row.status !== "published" ? <StatusButton id={row.id} status="published" label="Опубликовать" disabled={disabled} /> : null}
                  {row.status === "published" ? <StatusButton id={row.id} status="hidden" label="Скрыть с сайта" disabled={disabled} /> : null}
                  {row.status === "new" ? <StatusButton id={row.id} status="hidden" label="Не публиковать" disabled={disabled} /> : null}
                  {row.status === "hidden" ? <StatusButton id={row.id} status="new" label="Вернуть в новые" disabled={disabled} /> : null}
                  {/* Удаление навсегда — только для скрытых, чтобы не стереть отзыв случайным нажатием */}
                  {row.status === "hidden" ? (
                    <form action={deleteSiteReview}>
                      <input type="hidden" name="id" value={row.id} />
                      <button type="submit" className={`${styles.secondary} ${styles.danger}`} disabled={disabled}>
                        Удалить навсегда
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </>
  );
}
