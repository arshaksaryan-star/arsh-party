"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CircleVideo.module.css";

/**
 * Видео-кружок, как в Telegram. Крутится без звука; нажатие — со звуком с начала
 * и бегущим кольцом прогресса; ещё нажатие — пауза; досмотрели — снова тихий повтор.
 * Размер задаёт родитель (ширина обёртки), кружок занимает её целиком.
 */
export function CircleVideo({
  video,
  poster,
  label = "Смотреть со звуком",
  onSoundChange,
  autoSound = false,
}: {
  video: string;
  poster: string | null;
  label?: string;
  onSoundChange?: (withSound: boolean) => void;
  /** Сразу включить звук (после нажатия пользователя на свёрнутый кружок). */
  autoSound?: boolean;
}) {
  const element = useRef<HTMLVideoElement>(null);
  const [withSound, setWithSound] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const tick = () => setProgress(node.duration ? node.currentTime / node.duration : 0);
    node.addEventListener("timeupdate", tick);
    return () => node.removeEventListener("timeupdate", tick);
  }, [video]);

  function sound(on: boolean) {
    setWithSound(on);
    onSoundChange?.(on);
  }

  function startWithSound() {
    const node = element.current;
    if (!node) return;
    node.muted = false;
    node.currentTime = 0;
    node.loop = false;
    void node.play().catch(() => {
      // браузер не дал звук — оставляем тихо
      node.muted = true;
      void node.play();
      sound(false);
    });
    sound(true);
    setPlaying(true);
  }

  useEffect(() => {
    if (autoSound) startWithSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSound]);

  function toggle() {
    const node = element.current;
    if (!node) return;
    if (!withSound) return startWithSound();
    if (node.paused) {
      void node.play();
      setPlaying(true);
    } else {
      node.pause();
      setPlaying(false);
    }
  }

  function ended() {
    const node = element.current;
    if (!node) return;
    node.muted = true;
    node.loop = true;
    void node.play();
    sound(false);
    setPlaying(true);
  }

  const circumference = 2 * Math.PI * 49;

  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.circle} onClick={toggle} aria-label={withSound ? (playing ? "Пауза" : "Продолжить") : label}>
        <video ref={element} src={video} poster={poster ?? undefined} autoPlay muted loop playsInline preload="metadata" onEnded={ended} />
        {!withSound ? (
          <span className={styles.sound} aria-hidden="true">
            🔊
          </span>
        ) : null}
      </button>
      <svg className={styles.ring} viewBox="0 0 104 104" aria-hidden="true">
        <circle cx="52" cy="52" r="49" className={styles.track} />
        {withSound ? (
          <circle cx="52" cy="52" r="49" className={styles.progress} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
        ) : null}
      </svg>
    </span>
  );
}
