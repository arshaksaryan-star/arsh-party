"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Direction, DirectionSlug } from "@/content/directions";
import { Star } from "@/components/ui/Star";
import styles from "./StarSwitcher.module.css";

/**
 * Переключатель пяти звёзд на страницах направлений: липнет под шапкой,
 * в одно касание переносит на соседнюю звезду. Текущая — залита своим цветом.
 */
export function StarSwitcher({ directions, current }: { directions: Direction[]; current: DirectionSlug }) {
  const listRef = useRef<HTMLUListElement>(null);

  // На телефоне лента листается: текущую звезду сразу показываем в поле зрения.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !item || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2;
  }, [current]);

  return (
    <nav className={styles.bar} aria-label="Другие звёзды Arsh Party">
      <ul ref={listRef} className={`container ${styles.list}`}>
        {directions.map((direction) => {
          const active = direction.slug === current;
          return (
            <li key={direction.slug}>
              <Link
                href={`/${direction.slug}`}
                className={styles.link}
                data-star={direction.star}
                aria-current={active ? "page" : undefined}
                scroll={!active}
              >
                <Star color={direction.star} className={styles.star} />
                {direction.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
