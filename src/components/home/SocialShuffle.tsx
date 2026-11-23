"use client";

import { Children, useEffect, useState } from "react";
import styles from "./SocialFeed.module.css";

/**
 * На телефоне показываем одну соцсеть — каждый раз случайную; «Показать все» раскрывает все три.
 * На компьютере видны все сразу (правило в SocialFeed.module.css).
 */
export function SocialShuffle({ children, count }: { children: React.ReactNode; count: number }) {
  const items = Children.toArray(children);
  const [pick, setPick] = useState(0);
  const [open, setOpen] = useState(false);

  // Случайная — только в браузере, чтобы разметка сервера и браузера совпала при загрузке.
  useEffect(() => setPick(Math.floor(Math.random() * items.length)), [items.length]);

  return (
    <>
      <div className={styles.grid} data-count={count}>
        {items.map((item, index) => (
          <div key={index} className={styles.slot} data-hide={!open && index !== pick ? "true" : "false"}>
            {item}
          </div>
        ))}
      </div>
      {items.length > 1 && !open ? (
        <button type="button" className={styles.more} onClick={() => setOpen(true)}>
          Показать все соцсети · {items.length}
        </button>
      ) : null}
    </>
  );
}
