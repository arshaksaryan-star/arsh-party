import Link from "next/link";
import { defaultDirections } from "@/content/directions";
import { formatEventDate, type EventRow } from "@/lib/events";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import { Star } from "@/components/ui/Star";
import styles from "@/components/admin/admin.module.css";

async function loadEvents(): Promise<{ rows: EventRow[]; error: boolean }> {
  if (!isSupabaseConfigured()) return { rows: [], error: false };
  try {
    const rows = await selectRows<EventRow>("events", "?select=*&order=event_date.desc.nullslast,created_at.desc&limit=300", "no-store");
    return { rows, error: false };
  } catch (error) {
    console.error("[admin] events", error);
    return { rows: [], error: true };
  }
}

export default async function AdminEventsPage() {
  const { rows, error } = await loadEvents();
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Праздники</h1>
        <p className={styles.pageHint}>
          Архив мероприятий для страницы /prazdniki и блока «Как это было» на страницах звёзд. Фото загружаются сюда, видео — в VK
          Видео, а сюда вставляется ссылка.
        </p>
      </div>
      <div className={styles.toolbar}>
        <Link href="/admin/events/new" className={styles.primary}>
          ＋ Новый праздник
        </Link>
      </div>
      {error ? (
        <p className={styles.notice}>
          Не удалось загрузить праздники. Проверьте, что в Supabase выполнен <code>supabase/2026-11-11-events.sql</code>.
        </p>
      ) : null}
      {!error && rows.length === 0 ? <p className={styles.empty}>Праздников пока нет. Начните с последнего мероприятия.</p> : null}
      {rows.map((row) => {
        const direction = defaultDirections.find((item) => item.slug === row.direction);
        const cover = row.cover_url ?? row.photos?.[0] ?? null;
        return (
          <Link key={row.id} href={`/admin/events/${row.id}`} className={styles.item} style={{ textDecoration: "none", color: "inherit" }}>
            {cover ? <img src={cover} alt="" className={styles.thumb} /> : <span className={styles.thumb}>нет фото</span>}
            <span className={styles.itemText}>
              <span className={styles.itemTitle}>
                {row.title}
                {row.is_published ? null : <span className={styles.badgeOff}>скрыт</span>}
              </span>
              <span className={styles.itemMeta}>
                {[direction?.short, formatEventDate(row.event_date), row.place, `${row.photos?.length ?? 0} фото`, row.videos?.length ? `${row.videos.length} видео` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            {direction ? <Star color={direction.star} className={styles.cardStar} /> : null}
          </Link>
        );
      })}
    </>
  );
}
