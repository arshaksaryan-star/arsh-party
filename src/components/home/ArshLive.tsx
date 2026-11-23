"use client";

import { useEffect, useState } from "react";
import { useContent } from "@/components/content/ContentProvider";
import { CircleVideo } from "@/components/ui/CircleVideo";
import { PlaneIcon } from "@/components/ui/icons";
import type { LiveCircle } from "@/lib/live";
import styles from "./ArshLive.module.css";

function ago(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 5) return `${days} дня назад`;
  return `${days} дней назад`;
}

/**
 * Arsh Live: большой кружок — приветствие Арша (загружается в админке),
 * маленький — портал в канал: свежий кружок за неделю или знак канала.
 */
export function ArshLiveView({ fresh }: { fresh: LiveCircle | null }) {
  const { site, circles, photos } = useContent();
  const greeting = circles.greeting && !circles.greeting.hidden ? circles.greeting : null;
  const [freshLabel, setFreshLabel] = useState<string | null>(null);
  // «вчера / 3 дня назад» считаем в браузере, чтобы не расходилось с кэшем страницы.
  useEffect(() => {
    if (fresh) setFreshLabel(ago(fresh.date));
  }, [fresh]);

  if (!site.liveChannelUrl) return null;

  return (
    <section id="arsh-live" className={`container ${styles.live}`} aria-labelledby="arsh-live-title">
      <div className={styles.circleWrap}>
        {greeting ? (
          <CircleVideo video={greeting.video} poster={greeting.poster ?? photos.ok} label="Привет от Арша — смотреть со звуком" />
        ) : (
          <span className={styles.photo}>
            <img src={photos.ok} alt="Арш" />
          </span>
        )}

        {/* Портал в канал: свежий кружок за неделю или знак канала */}
        <a
          href={fresh?.postUrl ?? site.liveChannelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.portal}
          aria-label={fresh ? "Свежий кружок в канале Arsh Live" : "Канал Arsh Live в Telegram"}
        >
          {fresh ? (
            <video src={fresh.video} poster={fresh.poster ?? undefined} autoPlay muted loop playsInline preload="metadata" />
          ) : (
            <span className={styles.portalEmpty}>
              <PlaneIcon className={styles.portalIcon} />
            </span>
          )}
          <span className={styles.portalBadge}>
            <span className={styles.dot} aria-hidden="true" />
            LIVE
          </span>
        </a>
      </div>

      <div className={styles.text}>
        <p className={styles.eyebrow}>
          <span className={styles.dot} aria-hidden="true" />
          Arsh Live
        </p>
        <h2 id="arsh-live-title" className={styles.title}>
          Привет от Арша
        </h2>
        {site.liveText ? <p className={styles.lead}>{site.liveText}</p> : null}
        {fresh ? (
          <p className={styles.fresh}>
            Свежий кружок в канале{freshLabel ? ` · ${freshLabel}` : ""} — нажмите на маленький круг
          </p>
        ) : null}
        <a href={site.liveChannelUrl} target="_blank" rel="noopener noreferrer" className={styles.button}>
          <PlaneIcon className={styles.buttonIcon} />
          Подписаться на Arsh Live
        </a>
      </div>
    </section>
  );
}
