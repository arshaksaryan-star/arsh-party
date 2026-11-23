"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReviewPlatform } from "@/content/reviews";
import { useContent } from "@/components/content/ContentProvider";
import { defaultDirections } from "@/content/directions";
import { Plate } from "@/components/ui/Plate";
import styles from "./AboutArsh.module.css";

/*
 * Цифры — со слов владельца (14.11.2026): работаем с 2018 года без перерывов;
 * последние три года — 10–15 больших мероприятий и 30–40 фуршетов и кейтерингов в год.
 * 40–55 = 10 + 30 … 15 + 40. Доставка с мангала сюда не входит.
 * Оценка Яндекса — из админки → «Отзывы».
 */
function makeStats(yandex: ReviewPlatform | undefined) {
  return [
    { value: "2018", label: "год старта — с тех пор без единой паузы" },
    { value: "40–55", label: "праздников, фуршетов и кейтерингов в год" },
    ...(yandex
      ? [{ value: `${yandex.rating.toLocaleString("ru-RU")} ★`, label: `${yandex.name}, ${yandex.ratingsLabel}` }]
      : [{ value: String(defaultDirections.length), label: "направлений" }]),
  ];
}

type Slide = {
  photo: string;
  alt: string;
  /** Чёрно-белое фото — для портрета, остальные цветные. */
  mono?: boolean;
  eyebrow: string;
  title: string;
  accent: string;
  text: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    photo: "/photos/arsh-portrait.jpg",
    alt: "Арш в шляпе и пальто, чёрно-белый портрет",
    mono: true,
    eyebrow: "О проекте",
    title: "Не просто кейтеринг.",
    accent: "Личная история.",
    text: (
      <>
        Арш решает задачи. <strong>Тихо, уверенно, без лишней суеты.</strong> Как в кино Гая Ричи: снаружи всё сложно,
        а внутри — чёткий план. Гости не замечают работы. Потому что она сделана как надо.
      </>
    ),
  },
  {
    photo: "/photos/arsh-host-hat.jpg",
    alt: "Арш в шляпе на празднике",
    eyebrow: "Связь с городом",
    title: "Arsh Party — моё детище.",
    accent: "И моё альтер-эго.",
    text: (
      <>
        Через него я на прямой связи с городом. <strong>Каждый отзыв, сообщение и заявку я вижу сам</strong> — без
        менеджеров между нами.
      </>
    ),
  },
  {
    photo: "/photos/arsh-grill.jpg",
    alt: "Арш у мангала с поросёнком на вертеле",
    eyebrow: "Семейные традиции",
    title: "В армянской семье всегда праздник.",
    accent: "И всегда шашлык.",
    text: (
      <>
        Arsh Party выросла из лучших семейных традиций. <strong>Так что опыт у меня куда старше 2018-го.</strong>
      </>
    ),
  },
  {
    photo: "/photos/arsh-ok.jpg",
    alt: "Арш показывает жест «всё отлично»",
    eyebrow: "Секрет вкуса",
    title: "Папин маринад.",
    accent: "Легендарный.",
    text: (
      <>
        <strong>Широко известный в узких кругах 👌</strong> На нём держится вкус шашлыка Arsh Party. Попробуйте — и
        узкий круг станет чуть шире.
      </>
    ),
  },
  {
    photo: "/photos/arsh-host.jpg",
    alt: "Арш с микрофоном ведёт вечер",
    eyebrow: "С 2018 года",
    title: "Кризисы, ковид.",
    accent: "Мы не останавливались.",
    text: (
      <>
        Ни одного перерыва с 2018-го. Для нас это главная гарантия: <strong>кто работал вчера, тот будет и завтра.</strong>{" "}
        Ваш праздник не зависит от того, что творится вокруг.
      </>
    ),
  },
  {
    photo: "/photos/arsh-fun.jpg",
    alt: "Арш смеётся на празднике",
    eyebrow: "В цифрах",
    title: "Каждый заказ —",
    accent: "событие.",
    text: (
      <>
        Последние три года — 10–15 больших праздников и 30–40 фуршетов и кейтерингов ежегодно. Плюс мангал каждый день.
        Но счёт не главное: <strong>коробка шашлыка на двоих для нас такое же событие</strong>, как свадьба на сто гостей.
      </>
    ),
  },
  {
    // Временно: владелец пришлёт своё фото для этого слайда.
    photo: "/photos/arsh-grill.jpg",
    alt: "Арш у мангала",
    eyebrow: "Куда растём",
    title: "Пока — ремесленники.",
    accent: "И это останется.",
    text: (
      <>
        Мы готовы к масштабу. Больше гостей, больше городов. Но ремесленное отношение не отдадим:{" "}
        <strong>руками, на живом огне, с вниманием к каждому.</strong>
      </>
    ),
  },
];

const SLIDE_MS = 7000;

export function AboutArsh() {
  // Фото слайдов и оценка Яндекса меняются в админке; порядок слайдов — about-1 … about-7.
  const { photos, reviews } = useContent();
  const stats = makeStats(reviews.platforms.find((platform) => platform.id === "yandex"));
  const photoOf = (i: number) => photos[`about-${i + 1}` as keyof typeof photos] ?? SLIDES[i].photo;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const section = useRef<HTMLElement>(null);
  const touch = useRef<number | null>(null);

  const go = useCallback((next: number) => setIndex((next + SLIDES.length) % SLIDES.length), []);

  // Листаем сами, только когда блок на экране и человек не держит палец/мышь на нём.
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.4 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => go(index + 1), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, visible, paused, go]);

  const slide = SLIDES[index];

  return (
    <section
      ref={section}
      className={`container ${styles.section}`}
      aria-labelledby="about-title"
      aria-roledescription="карусель"
      id="about"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.grid}>
        <figure
          className={styles.portrait}
          onTouchStart={(event) => {
            touch.current = event.touches[0].clientX;
            setPaused(true);
          }}
          onTouchEnd={(event) => {
            const start = touch.current;
            touch.current = null;
            setPaused(false);
            if (start === null) return;
            const delta = event.changedTouches[0].clientX - start;
            if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1));
          }}
        >
          {SLIDES.map((item, i) => (
            <Image
              key={item.eyebrow}
              src={photoOf(i)}
              unoptimized={photoOf(i).startsWith("http")}
              alt={i === index ? item.alt : ""}
              fill
              priority={i === 0}
              sizes="(min-width: 900px) 40vw, 100vw"
              className={`${styles.portraitImage} ${item.mono ? styles.mono : ""}`}
              data-active={i === index ? "true" : "false"}
            />
          ))}
          <figcaption className={styles.caption}>
            <Plate>Арш</Plate>
          </figcaption>

          <div className={styles.bars} aria-hidden="true">
            {SLIDES.map((item, i) => (
              <span key={item.eyebrow} className={styles.bar}>
                <span
                  className={styles.barFill}
                  data-state={i < index ? "done" : i === index ? "now" : "next"}
                  style={i === index ? { animationPlayState: paused || !visible ? "paused" : "running" } : undefined}
                />
              </span>
            ))}
          </div>
          <button type="button" className={`${styles.tap} ${styles.tapPrev}`} onClick={() => go(index - 1)} aria-label="Предыдущий слайд" />
          <button type="button" className={`${styles.tap} ${styles.tapNext}`} onClick={() => go(index + 1)} aria-label="Следующий слайд" />
        </figure>

        <div className={styles.text}>
          <div key={index} className={styles.slideText} aria-live="polite">
            <p className={styles.eyebrow}>
              {slide.eyebrow} · {index + 1}/{SLIDES.length}
            </p>
            <h2 id="about-title" className={styles.heading}>
              {slide.title} <span className={styles.accent}>{slide.accent}</span>
            </h2>
            <p className={styles.paragraph}>{slide.text}</p>
          </div>

          <div className={styles.dots} role="tablist" aria-label="Слайды о проекте">
            {SLIDES.map((item, i) => (
              <button
                key={item.eyebrow}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={item.eyebrow}
                className={styles.dot}
                onClick={() => go(i)}
              >
                {item.eyebrow}
              </button>
            ))}
          </div>

          <dl className={styles.stats}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.stat}>
                <dt className={styles.statLabel}>{stat.label}</dt>
                <dd className={styles.statValue}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
