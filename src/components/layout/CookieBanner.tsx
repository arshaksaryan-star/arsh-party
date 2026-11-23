"use client";

import { useEffect, useState } from "react";
import { CONSENT_OPEN_EVENT, readConsent, saveConsent, type Consent } from "@/lib/consent";
import { Star } from "@/components/ui/Star";
import styles from "./CookieBanner.module.css";

/**
 * Плашка о cookie при первом заходе. Чёрная, как подвал, со звездой в цвет выбранного направления.
 * Пока посетитель не нажал «Принять», Яндекс Метрика не загружается.
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  // Пока плашка на экране, плавающие кнопки связи на телефоне её не перекрывают.
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.dataset.cookies = "pending";
    else delete root.dataset.cookies;
  }, [open]);

  if (!open) return null;

  const choose = (choice: Consent) => {
    saveConsent(choice);
    setOpen(false);
  };

  return (
    <section className={styles.banner} role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-text">
      <Star className={styles.star} />
      <div className={styles.body}>
        <h2 id="cookie-title" className={styles.title}>
          Cookie к празднику
        </h2>
        <p id="cookie-text" className={styles.text}>
          Сайт использует cookie. Так мы видим, что гостям удобно, а что нет, и делаем сайт лучше.
          Нажимая «Принять», вы соглашаетесь на обработку этих данных. Без согласия работают только необходимые
          cookie.{" "}
          <a href="/privacy#cookie" className={styles.link}>
            Подробнее
          </a>
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.accept} onClick={() => choose("granted")}>
            Принять
          </button>
          <button type="button" className={styles.decline} onClick={() => choose("denied")}>
            Только необходимые
          </button>
        </div>
      </div>
    </section>
  );
}

/** Кнопка в подвале: снова открыть плашку и поменять решение. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>
      Настройки cookie
    </button>
  );
}
