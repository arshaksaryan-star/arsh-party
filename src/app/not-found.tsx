import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Plate } from "@/components/ui/Plate";
import { Star } from "@/components/ui/Star";
import { getContent } from "@/lib/content";
import styles from "./not-found.module.css";

// Корневая 404 живёт вне группы (site), поэтому шапку и подвал подключает сама.
export default async function NotFound() {
  const { directions } = await getContent();
  return (
    <>
      <Header />
      <main id="content">
        <section className={`container ${styles.wrap}`}>
          <Star color="red" className={styles.star} />
          <h1 className={styles.title}>
            <Plate>404</Plate>
          </h1>
          <p className={styles.text}>
            Эта звезда пока не зажглась. Возможно, страница ещё в работе или адрес набран с ошибкой.
          </p>
          <ButtonLink href="/">На главную</ButtonLink>
          <div className={styles.stars}>
            <p className={styles.starsTitle}>Или сразу к одной из пяти звёзд:</p>
            <ul className={styles.starsList}>
              {directions.map((direction) => (
                <li key={direction.slug}>
                  <a href={`/${direction.slug}`} className={styles.starLink}>
                    <Star color={direction.star} className={styles.starIcon} />
                    <span>{direction.short}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
