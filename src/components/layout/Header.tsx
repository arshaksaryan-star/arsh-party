import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { phoneHref } from "@/content/site";
import { getContent } from "@/lib/content";
import { SectionMenu } from "./SectionMenu";
import { SectionNav } from "./SectionNav";
import styles from "./Header.module.css";

/** Блоки главной для быстрой навигации. id совпадают с id секций на странице. */
export const SECTIONS = [
  { id: "directions", label: "Направления" },
  { id: "prazdniki", label: "Праздники", href: "/prazdniki" },
  { id: "podarok", label: "Сертификаты", href: "/podarok" },
  { id: "about", label: "О нас" },
  { id: "reviews", label: "Отзывы" },
  { id: "order", label: "Заявка" },
  { id: "social", label: "Соцсети" },
  { id: "contact", label: "Контакты" },
] as const;

export async function Header() {
  const { site } = await getContent();
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label={`${site.name} — на главную`}>
          {/* SVG без оптимизации: файл уже векторный и лёгкий */}
          <img src="/brand/arsh-party.svg" alt="" width={1280} height={668} />
        </Link>
        {/* Бета: сноска со звёздочкой — в подвале (#beta); на телефоне метки нет, сноска остаётся */}
        <a href="#beta" className={styles.beta} aria-label="Бета-версия сайта — подробнее внизу страницы">
          beta*
        </a>

        {/* Компьютер — лента разделов; телефон — неподвижная кнопка «☰ Разделы» */}
        <SectionNav sections={SECTIONS} className={styles.nav} />
        <SectionMenu sections={SECTIONS} className={styles.menu} />

        <Link href="/kabinet" className={styles.account} aria-label="Личный кабинет" title="Личный кабинет">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8.5" r="4" />
            <path d="M4 20.5c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5" />
          </svg>
        </Link>

        {site.phone ? (
          // На телефоне звонок есть в плавающих кнопках, здесь он для широких экранов.
          <ButtonLink href={phoneHref(site.phone)} className={styles.phone}>
            {site.phone}
          </ButtonLink>
        ) : null}
      </div>
    </header>
  );
}
