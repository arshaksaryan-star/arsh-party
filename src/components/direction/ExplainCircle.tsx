"use client";

import { useEffect, useState } from "react";
import { CircleVideo } from "@/components/ui/CircleVideo";
import styles from "./ExplainCircle.module.css";

const DELAY_MS = 12000;

/**
 * Кружок Арша на странице звезды: через ~12 секунд «вылетает» в углу —
 * «Что такое СШП? Объясню за минуту». Нажатие — кружок крупнее и со звуком.
 * Закрыли — в этой вкладке браузера на этой странице больше не появится.
 */
export function ExplainCircle({ slug, short, video, poster }: { slug: string; short: string; video: string; poster: string | null }) {
  const key = `arsh:circle:${slug}`;
  const [shown, setShown] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(key) === "closed") return;
    } catch {
      // хранилище недоступно — просто показываем
    }
    const timer = window.setTimeout(() => setShown(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [key]);

  if (!shown) return null;

  function close() {
    setShown(false);
    try {
      window.sessionStorage.setItem(key, "closed");
    } catch {
      // не запомнили — ничего страшного
    }
  }

  return (
    <aside className={styles.dock} data-expanded={expanded} aria-label={`Арш объясняет: ${short}`}>
      <div className={styles.circle}>
        <CircleVideo video={video} poster={poster} autoSound={expanded} label={`Что такое ${short} — смотреть со звуком`} />
        {!expanded ? (
          <button type="button" className={styles.open} onClick={() => setExpanded(true)} aria-label={`Что такое ${short}? Смотреть со звуком`} />
        ) : null}
        <button type="button" className={styles.close} onClick={close} aria-label="Закрыть">
          ✕
        </button>
      </div>
      {!expanded ? (
        <button type="button" className={styles.bubble} onClick={() => setExpanded(true)}>
          Что такое <b>{short}</b>? Объясню за минуту
        </button>
      ) : null}
    </aside>
  );
}
