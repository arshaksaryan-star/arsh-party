"use client";

import { useEffect, useState } from "react";
import styles from "./ScrollTopButton.module.css";

const RADIUS = 24;
const CIRCLE = 2 * Math.PI * RADIUS;

/**
 * Кнопка «Наверх» в левом нижнем углу. Появляется после первого экрана.
 * Кольцо вокруг стрелки заполняется цветом выбранной звезды по мере прокрутки.
 */
export function ScrollTopButton() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(window.scrollY > window.innerHeight * 0.8);
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      className={`${styles.button} ${visible ? styles.visible : ""}`}
      onClick={toTop}
      aria-label="Наверх"
      title="Наверх"
      tabIndex={visible ? undefined : -1}
      aria-hidden={visible ? undefined : true}
    >
      <svg className={styles.ring} viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={RADIUS} className={styles.track} />
        <circle
          cx="26"
          cy="26"
          r={RADIUS}
          className={styles.fill}
          strokeDasharray={CIRCLE}
          strokeDashoffset={CIRCLE * (1 - progress)}
        />
      </svg>
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
