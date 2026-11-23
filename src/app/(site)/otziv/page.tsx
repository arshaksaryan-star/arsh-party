import type { Metadata } from "next";
import Image from "next/image";
import { getContent } from "@/lib/content";
import type { StarColor } from "@/content/directions";
import { Star } from "@/components/ui/Star";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import styles from "./otziv.module.css";

// Страница для клиентов: ссылку отправляют после праздника. В меню её нет, поисковикам она не нужна.
export const metadata: Metadata = {
  title: "Оставить отзыв",
  description: "Оставьте отзыв об Arsh Party на удобной площадке.",
  robots: { index: false, follow: false },
};

type Platform = { id: string; name: string; caption: string; url: string | null; star: StarColor };

function withText(url: string, text: string) {
  return `${url}${url.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}`;
}

export default async function ReviewPage() {
  const { site, photos, reviews } = await getContent();
  const rating = (id: string) => {
    const platform = reviews.platforms.find((item) => item.id === id);
    return platform ? `${platform.rating.toLocaleString("ru-RU")} ★ · ${platform.ratingsLabel}` : null;
  };

  const platforms: Platform[] = [
    { id: "yandex", name: "Яндекс", caption: rating("yandex") ?? "Яндекс Карты", url: site.reviewYandexUrl, star: "pink" },
    { id: "2gis", name: "2ГИС", caption: rating("2gis") ?? "Карточка в 2ГИС", url: site.review2gisUrl, star: "green" },
    { id: "vk", name: "ВКонтакте", caption: "Сообщество @arshparty", url: site.reviewVkUrl, star: "blue" },
    { id: "avito", name: "Авито", caption: "Профиль на Авито", url: site.reviewAvitoUrl, star: "orange" },
  ];
  const greeting = "Арш, привет! Хочу оставить отзыв о празднике: ";
  const mobileDigits = site.mobile ? site.mobile.replace(/[^\d+]/g, "") : null;
  const direct = [
    site.whatsappUrl ? { id: "whatsapp", label: "WhatsApp", href: withText(site.whatsappUrl, greeting), external: true } : null,
    site.telegramUrl ? { id: "telegram", label: "Telegram", href: site.telegramUrl, external: true } : null,
    // Обычное SMS: «?&body=» понимают и iPhone, и Android.
    mobileDigits ? { id: "sms", label: "Сообщение (SMS)", href: `sms:${mobileDigits}?&body=${encodeURIComponent(greeting)}`, external: false } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const active = platforms.filter((platform): platform is Platform & { url: string } => Boolean(platform.url));

  return (
    <section className={`container ${styles.page}`} aria-labelledby="review-title">
      <figure className={styles.photo}>
        <Image
          src={photos.ok}
          unoptimized={photos.ok.startsWith("http")}
          alt="Арш показывает жест «всё отлично»"
          fill
          priority
          sizes="(min-width: 900px) 420px, 100vw"
          className={styles.image}
        />
        <Star color="red" className={styles.photoStar} />
      </figure>

      <div className={styles.content}>
        <h1 id="review-title" className={styles.title}>
          Ваш отзыв разжигает праздник!
        </h1>
        <p className={styles.lead}>
          Спасибо, что праздновали с нами. Выберите площадку, где вам удобнее, — так мы делаем сервис ещё вкуснее.
        </p>

        <ul className={styles.grid}>
          {active.map((platform) => (
            <li key={platform.id}>
              <a
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.card}
                style={{ "--c": `var(--c-${platform.star})` } as React.CSSProperties}
              >
                <Star color={platform.star} className={styles.cardStar} />
                <span className={styles.cardText}>
                  <span className={styles.cardName}>{platform.name}</span>
                  <span className={styles.cardCaption}>{platform.caption}</span>
                </span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.siteBlock}>
          <h2 className={styles.siteTitle}>Или оставьте отзыв прямо здесь</h2>
          <ReviewForm />
        </div>

        {direct.length > 0 ? (
          <div className={styles.direct}>
            <p>Хотите сказать лично? Напишите Аршу:</p>
            <ul className={styles.directList}>
              {direct.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className={styles.directLink}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
