import Link from "next/link";
import styles from "./ThanksButton.module.css";

/** Кнопка после «Пяти звёзд»: ведёт на страницу отзывов /otziv. */
export function ThanksButton() {
  return (
    <div className={styles.wrap}>
      <Link href="/otziv" className={styles.button}>
        <svg viewBox="0 0 24 24" className={styles.heart} aria-hidden="true">
          <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4l1 1.6 1-1.6c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" />
        </svg>
        <span className={styles.text}>
          <span className={styles.title}>Я к вам с благодарностью!</span>
          <span className={styles.caption}>Оставить отзыв</span>
        </span>
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
      </Link>
    </div>
  );
}
