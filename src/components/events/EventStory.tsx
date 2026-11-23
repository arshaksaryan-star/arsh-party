"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Direction } from "@/content/directions";
import { formatEventDate, type EventRow } from "@/lib/events";
import { STAR_POINTS } from "@/components/ui/Star";
import styles from "./events.module.css";

type Slide = { kind: "photo"; src: string } | { kind: "video"; src: string } | { kind: "quote"; text: string; author: string | null };

const PHOTO_MS = 5000;

/** Праздник в формате сторис: фото листаются сами, видео ждёт, пока его досмотрят. */
export function EventStory({ event, direction, onClose }: { event: EventRow; direction?: Direction; onClose: () => void }) {
  const slides = useMemo<Slide[]>(() => {
    const photos = [...new Set([event.cover_url, ...(event.photos ?? [])].filter((src): src is string => Boolean(src)))];
    const list: Slide[] = photos.map((src) => ({ kind: "photo", src }));
    // Видео ставим после первого фото — так история начинается с картинки.
    const videos: Slide[] = (event.videos ?? []).map((src) => ({ kind: "video", src }));
    list.splice(Math.min(1, list.length), 0, ...videos);
    if (event.quote) list.push({ kind: "quote", text: event.quote, author: event.quote_author });
    return list;
  }, [event]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const slide = slides[index];
  const star = direction?.star ?? "red";

  const next = useCallback(() => setIndex((current) => (current + 1 < slides.length ? current + 1 : current)), [slides.length]);
  const prev = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);

  // Автолистание фото и цитаты; на видео стоим.
  useEffect(() => {
    if (!slide || slide.kind === "video" || paused || index === slides.length - 1) return;
    const timer = window.setTimeout(next, PHOTO_MS);
    return () => window.clearTimeout(timer);
  }, [slide, paused, index, slides.length, next]);

  // Стрелки, Esc; страница под историей не прокручивается.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, next, prev]);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // человек закрыл окно «Поделиться» — ничего страшного
    }
  }

  const meta = [direction?.short, formatEventDate(event.event_date), event.place].filter(Boolean).join(" · ");

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialog}
        className={styles.story}
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ "--story": `var(--sky-${star})`, "--on-story": `var(--on-${star})` } as React.CSSProperties}
      >
        {slide?.kind === "photo" ? <img src={slide.src} alt="" className={styles.storyMedia} /> : null}
        {slide?.kind === "video" ? (
          <iframe
            src={slide.src}
            className={styles.storyVideo}
            title={`Видео: ${event.title}`}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
            allowFullScreen
          />
        ) : null}
        {slide?.kind === "quote" ? (
          <div className={styles.storyQuote}>
            <svg viewBox="0 0 100 100" width="56" height="56" aria-hidden="true">
              <polygon points={STAR_POINTS} fill="currentColor" />
            </svg>
            <p className={styles.storyQuoteText}>«{slide.text}»</p>
            {slide.author ? <p className={styles.storyQuoteAuthor}>{slide.author}</p> : null}
          </div>
        ) : null}
        {!slide ? <div className={styles.storyQuote}><p className={styles.storyQuoteText}>Фото скоро появятся</p></div> : null}

        <div className={styles.storyShadeTop} aria-hidden="true" />
        <div className={styles.storyShadeBottom} aria-hidden="true" />

        <div className={styles.storyTop}>
          <div className={styles.bars} aria-hidden="true">
            {slides.map((item, n) => (
              <span key={n} className={styles.bar}>
                <span
                  key={n === index ? `run-${index}` : `bar-${n}`}
                  className={`${styles.barFill} ${n === index && item.kind !== "video" ? styles.barRun : ""}`}
                  style={{
                    width: n < index || (n === index && item.kind === "video") ? "100%" : n > index ? "0%" : undefined,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              </span>
            ))}
          </div>
          <div className={styles.storyHead}>
            <svg viewBox="0 0 100 100" width="32" height="32" aria-hidden="true">
              <polygon points={STAR_POINTS} style={{ fill: "var(--story)" }} />
            </svg>
            <span className={styles.storyHeadText}>
              <b>{event.title}</b>
              {meta ? <span>{meta}</span> : null}
            </span>
            <button type="button" className={styles.iconButton} onClick={() => setPaused((value) => !value)} aria-label={paused ? "Продолжить" : "Пауза"}>
              {paused ? "▶" : "❚❚"}
            </button>
            <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Закрыть">
              ✕
            </button>
          </div>
        </div>

        {/* Зоны листания; на видео они уже, чтобы не мешать кнопкам плеера */}
        <button type="button" className={`${styles.tap} ${styles.tapPrev} ${slide?.kind === "video" ? styles.tapNarrow : ""}`} onClick={prev} aria-label="Назад" disabled={index === 0} />
        <button type="button" className={`${styles.tap} ${styles.tapNext} ${slide?.kind === "video" ? styles.tapNarrow : ""}`} onClick={next} aria-label="Дальше" disabled={index >= slides.length - 1} />

        <div className={styles.storyBottom}>
          {event.summary && index === 0 ? <p className={styles.storySummary}>{event.summary}</p> : null}
          <div className={styles.storyActions}>
            <Link href={`/${event.direction}#order`} className={styles.want}>
              Хочу так же
            </Link>
            <button type="button" className={styles.share} onClick={share} aria-label="Поделиться">
              {copied ? "✓" : "↗"}
            </button>
          </div>
          {copied ? <p className={styles.copied}>Ссылка скопирована</p> : null}
        </div>
      </div>
    </div>
  );
}
