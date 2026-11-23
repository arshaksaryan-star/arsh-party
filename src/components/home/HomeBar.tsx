"use client";

import { useEffect, useState } from "react";
import { useContent } from "@/components/content/ContentProvider";
import { Star } from "@/components/ui/Star";
import styles from "./HomeBar.module.css";

/**
 * Нижняя панель главной на телефоне: пять звёзд и «Заявка» всегда под пальцем (владелец, 15.11.2026).
 * Появляется не сразу, а когда прокрутили приветственный кружок Арша (владелец, 15.11.2026):
 * на первом экране звёзды уже есть, вторая полоса там лишняя.
 * Прячется, пока на экране форма заявки, и пока внизу плашка о cookie.
 * Пока панель на экране, плавающие кнопки связи поднимаются над ней (html[data-bar="1"]).
 * До кружка (html[data-bar="top"]) из кнопок связи на телефоне остаётся только звонок — как и с панелью.
 */
export function HomeBar() {
  const { directions } = useContent();
  const [passed, setPassed] = useState(false);
  const [atForm, setAtForm] = useState(false);
  const hidden = !passed || atForm;

  // Прошли ли кружок: низ блока Arsh Live уже на экране или выше. Нет блока — ориентир «Пять звёзд».
  useEffect(() => {
    const anchor = document.getElementById("arsh-live") ?? document.getElementById("directions");
    if (!anchor) {
      setPassed(true);
      return;
    }
    let frame = 0;
    const check = () => {
      frame = 0;
      const rect = anchor.getBoundingClientRect();
      const edge = anchor.id === "arsh-live" ? rect.bottom : rect.top;
      setPassed(edge <= window.innerHeight);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Форма заявки на экране — панель не нужна.
  useEffect(() => {
    const form = document.getElementById("order");
    if (!form) return;
    const observer = new IntersectionObserver(([entry]) => setAtForm(entry.isIntersecting), { rootMargin: "0px 0px -10% 0px" });
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // "1" — панель на экране; "top" — ещё не прокрутили кружок (на телефоне остаётся только звонок); "0" — у формы заявки.
    root.dataset.bar = atForm ? "0" : passed ? "1" : "top";
    return () => {
      delete root.dataset.bar;
    };
  }, [atForm, passed]);

  return (
    <nav className={`${styles.bar} ${hidden ? styles.away : ""}`} aria-label="Пять звёзд и заявка" aria-hidden={hidden || undefined}>
      {directions.map((direction) => (
        <a key={direction.slug} href={`/${direction.slug}`} className={styles.star} tabIndex={hidden ? -1 : undefined}>
          <Star color={direction.star} className={styles.icon} />
          <span>{direction.short}</span>
        </a>
      ))}
      <a href="#order" className={styles.order} tabIndex={hidden ? -1 : undefined}>
        Заявка
      </a>
    </nav>
  );
}
