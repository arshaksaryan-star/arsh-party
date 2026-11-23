"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Direction, DirectionSlug } from "@/content/directions";
import { formatEventDate, type EventRow } from "@/lib/events";
import { STAR_POINTS } from "@/components/ui/Star";
import { EventStory } from "./EventStory";
import styles from "./events.module.css";

type Props = { events: EventRow[]; directions: Direction[] };

/**
 * Места звёзд на небе в процентах. Разнесены так, чтобы подписи не налезали друг на друга;
 * порядок — от свежих праздников к старым, свежие ближе к центру внимания.
 */
const SKY_SLOTS: readonly [number, number][] = [
  [22, 24], [52, 16], [80, 26], [62, 48], [30, 54], [82, 62], [46, 80], [18, 82], [72, 84],
  [38, 34], [64, 30], [20, 42], [50, 62], [84, 44], [34, 70], [60, 92], [26, 92], [78, 12],
];

function skyPosition(index: number) {
  const [x, y] = SKY_SLOTS[index % SKY_SLOTS.length];
  return { left: `${x}%`, top: `${y}%` };
}

function Star({ color, size }: { color: string; size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className={styles.skyStar}>
      <polygon points={STAR_POINTS} style={{ fill: color }} />
    </svg>
  );
}

export function EventsExplorer({ events, directions }: Props) {
  const [filter, setFilter] = useState<DirectionSlug | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const bySlug = useMemo(() => new Map(directions.map((direction) => [direction.slug, direction])), [directions]);
  const shown = filter === "all" ? events : events.filter((event) => event.direction === filter);
  const usedDirections = directions.filter((direction) => events.some((event) => event.direction === direction.slug));
  const open = events.find((event) => event.id === openId) ?? null;

  // Ссылка вида /prazdniki?e=<id> сразу открывает историю — ей удобно делиться.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("e");
    if (id && events.some((event) => event.id === id)) setOpenId(id);
  }, [events]);

  function show(id: string | null) {
    setOpenId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("e", id);
    else url.searchParams.delete("e");
    window.history.replaceState(null, "", url);
  }

  const sky = events.slice(0, SKY_SLOTS.length);

  return (
    <>
      <section className={styles.hero} aria-labelledby="events-title">
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>Архив Arsh Party</p>
            <h1 id="events-title" className={styles.title}>
              Праздники, которые уже случились
            </h1>
            <p className={styles.lead}>
              {events.length > 0
                ? "Каждая звезда — настоящее мероприятие. Нажмите, чтобы посмотреть фото и видео, как всё было."
                : "Скоро здесь появятся фото и видео с наших мероприятий. Каждая звезда — настоящий праздник."}
            </p>
            <div className={styles.heroActions}>
              {events.length > 0 ? (
                <button type="button" className={styles.primary} onClick={() => show(events[0].id)}>
                  Смотреть последний праздник →
                </button>
              ) : null}
              <Link href="/#order" className={styles.ghost}>
                Хочу так же
              </Link>
            </div>
          </div>

          <div className={styles.sky} role="group" aria-label="Праздники на небе">
            {sky.length > 0
              ? sky.map((event, index) => {
                  const direction = bySlug.get(event.direction);
                  const size = 26 + Math.min(4, (event.photos?.length ?? 0) / 4 + (event.videos?.length ?? 0)) * 7;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={styles.skyItem}
                      style={{ ...skyPosition(index), animationDelay: `${(index % 6) * 0.4}s` }}
                      onClick={() => show(event.id)}
                    >
                      <Star color={`var(--sky-${direction?.star ?? "red"})`} size={size} />
                      <span className={styles.skyLabel}>{event.title}</span>
                    </button>
                  );
                })
              : directions.map((direction, index) => (
                  <span key={direction.slug} className={styles.skyItem} style={skyPosition(index)} aria-hidden="true">
                    <Star color={`var(--sky-${direction.star})`} size={34} />
                  </span>
                ))}
          </div>
        </div>
      </section>

      {events.length > 0 ? (
        <section className={`container ${styles.list}`} aria-labelledby="events-list-title">
          <div className={styles.listHead}>
            <h2 id="events-list-title" className={styles.heading}>
              Как это было
            </h2>
            <p className={styles.count}>Показано: {shown.length}</p>
          </div>

          {usedDirections.length > 1 ? (
            <div className={styles.chips} role="group" aria-label="Фильтр по направлению">
              <button type="button" className={styles.chip} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                Все
              </button>
              {usedDirections.map((direction) => (
                <button
                  key={direction.slug}
                  type="button"
                  className={styles.chip}
                  aria-pressed={filter === direction.slug}
                  onClick={() => setFilter(direction.slug)}
                >
                  <svg viewBox="0 0 100 100" width="18" height="18" aria-hidden="true">
                    <polygon points={STAR_POINTS} style={{ fill: `var(--c-${direction.star})` }} />
                  </svg>
                  {direction.short}
                </button>
              ))}
            </div>
          ) : null}

          <ul className={styles.grid}>
            {shown.map((event) => (
              <li key={event.id}>
                <EventCard event={event} direction={bySlug.get(event.direction)} onOpen={() => show(event.id)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {open ? <EventStory event={open} direction={bySlug.get(open.direction)} onClose={() => show(null)} /> : null}
    </>
  );
}

export function EventCard({ event, direction, onOpen }: { event: EventRow; direction?: Direction; onOpen: () => void }) {
  const cover = event.cover_url ?? event.photos?.[0] ?? null;
  const meta = [formatEventDate(event.event_date), event.place].filter(Boolean).join(" · ");
  return (
    <button type="button" className={styles.card} onClick={onOpen}>
      <span className={styles.cardMedia}>
        {cover ? <img src={cover} alt="" className={styles.cardImg} loading="lazy" /> : <span className={styles.cardEmpty} />}
        {direction ? (
          <span className={styles.badge}>
            <svg viewBox="0 0 100 100" width="18" height="18" aria-hidden="true">
              <polygon points={STAR_POINTS} style={{ fill: `var(--sky-${direction.star})` }} />
            </svg>
            {direction.short}
          </span>
        ) : null}
        {event.videos && event.videos.length > 0 ? <span className={styles.videoBadge}>▶ Видео</span> : null}
      </span>
      <span className={styles.cardBody}>
        {meta ? <span className={styles.cardMeta}>{meta}</span> : null}
        <span className={styles.cardTitle}>{event.title}</span>
        {event.quote ? <span className={styles.cardQuote}>«{event.quote}»</span> : null}
      </span>
    </button>
  );
}
