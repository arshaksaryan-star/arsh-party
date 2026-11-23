"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CalcEgg.module.css";

const TAPS = 3;
const WINDOW_MS = 1500;

/**
 * Пасхалка на главной (владелец, 15.11.2026): три быстрых нажатия на логотип —
 * логотип подпрыгивает, снизу выезжает приглашение в калькулятор праздника.
 */
export function CalcEgg({ children }: { children: React.ReactNode }) {
  const taps = useRef<number[]>([]);
  const [open, setOpen] = useState(false);
  const [jump, setJump] = useState(false);

  useEffect(() => {
    if (!jump) return;
    const timer = window.setTimeout(() => setJump(false), 700);
    return () => window.clearTimeout(timer);
  }, [jump]);

  function tap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((time) => now - time < WINDOW_MS), now];
    if (taps.current.length >= TAPS) {
      taps.current = [];
      setJump(true);
      setOpen(true);
    }
  }

  return (
    <>
      <span className={`${styles.trigger} ${jump ? styles.jump : ""}`} onClick={tap}>
        {children}
      </span>
      {open ? (
        <div className={styles.egg} role="dialog" aria-label="Секрет Arsh Party">
          <span className={styles.icon} aria-hidden="true">
            🧮
          </span>
          <span className={styles.text}>
            <b>Нашли секрет!</b>
            Калькулятор праздника — сколько мяса на компанию
          </span>
          <a href="/kalkulyator" className={styles.go}>
            Посчитать
          </a>
          <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Закрыть">
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
}
