import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { accentVars, defaultDirections, getDirection, type Direction, type DirectionSlug } from "@/content/directions";
import { formatReviewDate, getPlatform, reviewsForDirection } from "@/content/reviews";
import { phoneHref } from "@/content/site";
import { ExplainCircle } from "@/components/direction/ExplainCircle";
import { StarSwitcher } from "@/components/direction/StarSwitcher";
import { EventsBlock } from "@/components/events/EventsBlock";
import { SocialFeed } from "@/components/home/SocialFeed";
import { OrderSection } from "@/components/order/OrderSection";
import { Star } from "@/components/ui/Star";
import { MangalMenu } from "@/components/mangal/MangalMenu";
import { PartyCalculator } from "@/components/mangal/PartyCalculator";
import { getContent } from "@/lib/content";
import { loadTodayMenu } from "@/lib/menu-data";
import { orderSettings } from "@/lib/order";
import styles from "./direction.module.css";

/** Только пять звёзд, остальные адреса — 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return defaultDirections.map((direction) => ({ direction: direction.slug }));
}

type Props = { params: Promise<{ direction: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { direction: slug } = await params;
  const { directions, pages } = await getContent();
  const direction = getDirection(slug, directions);
  if (!direction) return {};
  return {
    title: direction.title,
    description: pages[direction.slug].lead.slice(0, 160),
  };
}

/** Заголовок формы заявки на странице звезды. */
const ORDER_TITLE: Record<DirectionSlug, string> = {
  mangal: "Предзаказ и большие заказы",
  sshp: "Вызвать СШП",
  catering: "Рассчитать кейтеринг",
  events: "Обсудить праздник",
  host: "Проверить дату",
};

function Visual({ direction }: { direction: Direction }) {
  const { visual } = direction;
  if (visual.kind === "logo") {
    return (
      <div className={styles.logoTile}>
        {/* Логотип содержит название направления — заголовок уже есть рядом */}
        <img src={visual.src} alt="" width={visual.width} height={visual.height} className={styles.logo} />
      </div>
    );
  }
  return (
    <div className={styles.photoTile}>
      <Image src={visual.src} alt={visual.alt} fill priority sizes="(min-width: 900px) 45vw, 100vw" className={styles.photo} />
    </div>
  );
}

export default async function DirectionPage({ params }: Props) {
  const { direction: slug } = await params;
  const { site, directions, pages, circles, reviews: reviewsContent } = await getContent();
  const direction = getDirection(slug, directions);
  if (!direction) notFound();
  const circle = circles[direction.slug]?.hidden ? undefined : circles[direction.slug];

  const page = pages[direction.slug];
  const reviews = reviewsForDirection(direction.slug, 3, reviewsContent.items);
  const neighbours = directions.filter((item) => item.slug !== direction.slug);
  const isMenu = direction.mode === "menu";
  const menu = isMenu ? await loadTodayMenu() : null;

  return (
    <div className={styles.page} style={accentVars(direction.star) as React.CSSProperties}>
      <StarSwitcher directions={directions} current={direction.slug} />

      {/* ───── Первый экран ───── */}
      <section className={`container ${styles.hero}`} aria-labelledby="direction-title">
        <div className={styles.heroText}>
          <Link href="/#directions" className={styles.back}>
            ← Все звёзды
          </Link>
          <p className={styles.eyebrow}>
            <Star className={styles.eyebrowStar} />
            Arsh Party · {direction.short}
          </p>
          <h1 id="direction-title" className={styles.title}>
            {direction.title}
          </h1>
          <p className={styles.lead}>{page.lead}</p>
          {direction.tags.length > 0 ? (
            <ul className={styles.tags}>
              {direction.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
          <div className={styles.actions}>
            <a href={isMenu ? "#menu" : "#order"} className={styles.primary}>
              {isMenu ? "Открыть меню" : ORDER_TITLE[direction.slug]}
              <span aria-hidden="true">→</span>
            </a>
            {site.phone ? (
              <a href={phoneHref(site.phone)} className={styles.secondary}>
                {site.phone}
              </a>
            ) : null}
          </div>
        </div>
        <div className={styles.heroVisual}>
          <Visual direction={direction} />
          <Star className={styles.bigStar} />
        </div>
      </section>

      {/* ───── Калькулятор праздника (мангал): свёрнут в кнопку над меню ───── */}
      {menu && menu.items.length > 0 ? (
        <div className="container" style={{ marginTop: 24 }}>
          <PartyCalculator items={menu.items} compact />
        </div>
      ) : null}

      {/* ───── Меню на сегодня (мангал) ───── */}
      {menu ? (
        <MangalMenu
          items={menu.items}
          menuOk={menu.ok}
          settings={orderSettings(site)}
          phone={site.phone}
          phoneHref={site.phone ? phoneHref(site.phone) : null}
        />
      ) : null}

      {/* ───── Что входит ───── */}
      {page.included.length > 0 ? (
        <section className={`container ${styles.section}`} aria-labelledby="included-title">
          <h2 id="included-title" className={styles.heading}>
            Что входит
          </h2>
          <ul className={styles.included}>
            {page.included.map((item) => (
              <li key={item}>
                <Star className={styles.bullet} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ───── Форматы ───── */}
      {page.formats.length > 0 ? (
        <section className={`container ${styles.section}`} aria-labelledby="formats-title">
          <h2 id="formats-title" className={styles.heading}>
            Форматы
          </h2>
          <ul className={styles.formats} data-count={page.formats.length}>
            {page.formats.map((format) => (
              <li key={format.title} className={styles.format}>
                <h3 className={styles.formatTitle}>{format.title}</h3>
                {format.text ? <p className={styles.formatText}>{format.text}</p> : null}
                <p className={format.price ? styles.price : styles.priceAsk}>{format.price ?? "Цена по запросу"}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ───── Как проходит ───── */}
      {page.steps.length > 0 ? (
        <section className={`container ${styles.section}`} aria-labelledby="steps-title">
          <h2 id="steps-title" className={styles.heading}>
            Как это проходит
          </h2>
          <ol className={styles.steps}>
            {page.steps.map((step, index) => (
              <li key={step} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* ───── Праздники этого направления ───── */}
      <EventsBlock
        direction={direction}
        sectionClass={`container ${styles.section}`}
        headingClass={styles.heading}
        moreClass={styles.more}
      />

      {/* ───── Отзывы ───── */}
      {reviews.length > 0 ? (
        <section className={`container ${styles.section}`} aria-labelledby="direction-reviews-title">
          <div className={styles.headRow}>
            <h2 id="direction-reviews-title" className={styles.heading}>
              Что говорят гости
            </h2>
            <Link href="/#reviews" className={styles.more}>
              Все отзывы →
            </Link>
          </div>
          <div className={styles.reviews}>
            {reviews.map((review) => {
              const platform = review.platform === "site" ? null : getPlatform(review.platform, reviewsContent.platforms);
              return (
                <figure key={`${review.author}-${review.date}`} className={styles.review}>
                  {review.rating ? (
                    <p className={styles.reviewStars} aria-label={`Оценка ${review.rating} из 5`}>
                      {"★".repeat(Math.round(review.rating))}
                    </p>
                  ) : null}
                  <blockquote className={styles.reviewText}>{review.text}</blockquote>
                  <figcaption className={styles.reviewMeta}>
                    <b>{review.author}</b>
                    <span>
                      {formatReviewDate(review.date)}
                      {platform ? ` · ${platform.name}` : " · на сайте"}
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ───── Соцсети: только на мангале ───── */}
      {direction.slug === "mangal" ? (
        <SocialFeed networks={["vk", "instagram"]} sub="Свежие блюда с огня и праздники: три последних поста из ВКонтакте и Instagram." />
      ) : null}

      {/* ───── Вопросы ───── */}
      {page.faq.length > 0 ? (
        <section className={`container ${styles.section}`} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.heading}>
            Частые вопросы
          </h2>
          <div className={styles.faq}>
            {page.faq.map((item) => (
              <details key={item.q} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>{item.q}</summary>
                <p className={styles.faqAnswer}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <OrderSection direction={direction.slug} title={ORDER_TITLE[direction.slug]} />

      {/* Кружок Арша «объясняю за минуту» — вылетает через ~12 секунд */}
      {circle ? <ExplainCircle slug={direction.slug} short={direction.short} video={circle.video} poster={circle.poster} /> : null}

      {/* ───── Соседние звёзды ───── */}
      <nav className={`container ${styles.section}`} aria-labelledby="neighbours-title">
        <h2 id="neighbours-title" className={styles.heading}>
          Другие звёзды
        </h2>
        <ul className={styles.neighbours}>
          {neighbours.map((item) => (
            <li key={item.slug}>
              <Link href={`/${item.slug}`} className={styles.neighbour} style={{ "--c": `var(--c-${item.star})` } as React.CSSProperties}>
                <Star color={item.star} className={styles.neighbourStar} />
                <span className={styles.neighbourText}>
                  <b>{item.title}</b>
                  <span>{item.tagline}</span>
                </span>
                <span aria-hidden="true" className={styles.neighbourArrow}>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
