import Link from "next/link";
import type { Direction } from "@/content/directions";
import { formatEventDate } from "@/lib/events";
import { loadPublishedEvents } from "@/lib/events-data";
import styles from "./events.module.css";

/**
 * «Как это было»: последние праздники. На странице звезды — только её направления,
 * на главной (без direction) — все. Нет праздников — блока нет.
 */
export async function EventsBlock({ direction, headingClass, sectionClass, moreClass, title = "Как это было" }: {
  direction?: Direction;
  headingClass: string;
  sectionClass: string;
  moreClass: string;
  title?: string;
}) {
  const events = await loadPublishedEvents(direction?.slug, 3);
  if (events.length === 0) return null;
  return (
    <section className={sectionClass} aria-labelledby="direction-events-title">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "8px 24px" }}>
        <h2 id="direction-events-title" className={headingClass}>
          {title}
        </h2>
        <Link href="/prazdniki" className={moreClass}>
          Все праздники →
        </Link>
      </div>
      <div className={styles.block} data-count={events.length}>
        {events.map((event) => {
          const cover = event.cover_url ?? event.photos?.[0] ?? null;
          const meta = [formatEventDate(event.event_date), event.place].filter(Boolean).join(" · ");
          return (
            <Link key={event.id} href={`/prazdniki?e=${event.id}`} className={styles.blockCard}>
              {cover ? <img src={cover} alt="" loading="lazy" /> : null}
              {event.videos && event.videos.length > 0 ? <span className={`${styles.videoBadge} ${styles.videoBadgeTop}`}>▶ Видео</span> : null}
              <span className={styles.blockCaption}>
                {meta ? <span>{meta}</span> : null}
                <b>{event.title}</b>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
