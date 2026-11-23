import Image from "next/image";
import Link from "next/link";
import type { Direction } from "@/content/directions";
import { Star } from "@/components/ui/Star";
import styles from "./DirectionCard.module.css";

export function DirectionCard({ direction }: { direction: Direction }) {
  const cardStyle = {
    "--c": `var(--c-${direction.star})`,
    "--on-c": `var(--on-${direction.star})`,
  } as React.CSSProperties;
  const { visual } = direction;

  return (
    // Карточка ведёт на страницу звезды: /mangal, /sshp и т. д.
    <Link href={`/${direction.slug}`} className={styles.card} style={cardStyle}>
      <div className={visual.kind === "logo" ? styles.logoTile : styles.photoTile}>
        {visual.kind === "logo" ? (
          // Логотип направления уже содержит название, поэтому alt пустой: заголовок ниже.
          <img src={visual.src} alt="" width={visual.width} height={visual.height} className={styles.logo} loading="lazy" />
        ) : (
          <Image src={visual.src} alt={visual.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className={styles.photo} />
        )}
      </div>

      <div className={styles.top}>
        <Star color={direction.star} className={styles.star} />
        <span className={styles.mode}>{direction.modeLabel}</span>
      </div>

      <h3 className={styles.title}>{direction.title}</h3>
      <p className={styles.tagline}>{direction.tagline}</p>

      <ul className={styles.tags} aria-label="Особенности">
        {direction.tags.map((tag) => (
          <li key={tag} className={styles.tag}>
            {tag}
          </li>
        ))}
      </ul>

      <span className={styles.cta}>
        {direction.cta}
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </Link>
  );
}
