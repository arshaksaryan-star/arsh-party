"use client";

import { useEffect, useState } from "react";
import { ArshLogo } from "@/components/brand/ArshLogo";
import { useContent } from "@/components/content/ContentProvider";
import { accentVars } from "@/content/directions";
import { announceAccent } from "@/lib/accent";
import Link from "next/link";
import { Star } from "@/components/ui/Star";
import { CalcEgg } from "./CalcEgg";
import { FireParticles } from "./FireParticles";
import styles from "./HeroConstellation.module.css";

export function HeroConstellation() {
  const { site, directions } = useContent();
  // По умолчанию выбрана красная звезда — та, что стоит в логотипе.
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, directions.findIndex((direction) => direction.star === "red")),
  );
  const active = directions[activeIndex];

  // Сообщаем выбор всей странице: искры у краёв экрана берут тот же цвет.
  useEffect(() => {
    announceAccent(active.star);
  }, [active.star]);

  return (
    <section
      className={styles.hero}
      style={accentVars(active.star) as React.CSSProperties}
      aria-labelledby="hero-title"
      data-hero
    >
      <FireParticles star={active.star} />
      <div className={`container ${styles.inner}`}>
        <h1 id="hero-title" className={styles.title}>
          {/* Звезда в логотипе берёт цвет выбранного направления */}
          {/* Пасхалка: три быстрых нажатия на логотип — калькулятор праздника */}
          <CalcEgg>
            <ArshLogo className={styles.logo} />
          </CalcEgg>
          <span className="visually-hidden">
            {site.name} — всё для праздника в Рязани и по всему ЦФО
          </span>
        </h1>

        <p className={styles.lead}>
          {site.heroLead}
        </p>

        <div className={styles.sky} role="group" aria-label="Направления Arsh Party">
          {directions.map((direction, index) => (
            <button
              key={direction.slug}
              type="button"
              className={styles.starButton}
              style={{ "--c": `var(--c-${direction.star})` } as React.CSSProperties}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            >
              <Star color={direction.star} className={styles.starIcon} />
              <span className={styles.starLabel}>{direction.short}</span>
            </button>
          ))}
        </div>

        <div className={styles.detail} aria-live="polite">
          <p key={active.slug} className={styles.detailText}>
            <b>{active.title}.</b> {active.tagline}
          </p>
          <Link href={`/${active.slug}`} className={styles.detailLink}>
            {active.cta}
            <span aria-hidden="true" className={styles.detailArrow}>
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
