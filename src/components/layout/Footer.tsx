import Link from "next/link";
import { phoneHref } from "@/content/site";
import { getContent } from "@/lib/content";
import { Star } from "@/components/ui/Star";
import { CookieSettingsButton } from "./CookieBanner";
import styles from "./Footer.module.css";

export async function Footer() {
  const { site, directions } = await getContent();
  const year = new Date().getFullYear();
  // Куда сообщить о недочёте: WhatsApp, Telegram или телефон — что заполнено в админке.
  const reportHref = site.whatsappUrl ?? site.telegramUrl ?? (site.phone ? phoneHref(site.phone) : null);

  const links = [
    site.phone ? { href: phoneHref(site.phone), label: site.phone, external: false } : null,
    site.whatsappUrl ? { href: site.whatsappUrl, label: "WhatsApp", external: true } : null,
    site.telegramUrl ? { href: site.telegramUrl, label: "Telegram", external: true } : null,
    site.vkUrl ? { href: site.vkUrl, label: "ВКонтакте", external: true } : null,
    site.instagramUrl ? { href: site.instagramUrl, label: "Instagram**", external: true } : null,
  ].filter((link): link is NonNullable<typeof link> => link !== null);

  return (
    <footer className={styles.footer} id="contacts">
      {/* Три колонки: направления слева, логотип по центру, связь справа. Обе боковые — по 5 строк. */}
      <div className={`container ${styles.inner}`}>
        <nav aria-label="Направления" className={`${styles.col} ${styles.colLeft}`}>
          <p className={styles.colTitle}>Пять звёзд</p>
          <ul className={styles.list}>
            {directions.map((direction) => (
              <li key={direction.slug}>
                <Link href={`/${direction.slug}`} className={styles.link}>
                  <Star color={direction.star} className={styles.star} />
                  {direction.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.brand}>
          <img src="/brand/arsh-party.svg" alt={site.name} width={1280} height={668} className={styles.logo} />
          {/* Слоган уже на ленте логотипа, здесь — фраза из админки */}
          {site.footerTagline ? <p className={styles.slogan}>{site.footerTagline}</p> : null}
          {site.address || site.hours ? (
            <p className={styles.place}>
              {site.address ? (
                <span>
                  {site.city}, {site.address}
                </span>
              ) : null}
              {site.hours ? <span>{site.hours}</span> : null}
            </p>
          ) : null}
        </div>

        <div className={`${styles.col} ${styles.colRight}`}>
          <p className={styles.colTitle}>Связаться</p>
          <ul className={styles.list}>
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={styles.link}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <span>
          © {year} {site.name} · {site.region}
          <small id="beta" className={styles.footnote}>
            * Сайт в бета-версии: всё тестируем, возможны недочёты.{" "}
            {reportHref ? (
              <a href={reportHref} className={styles.footnoteLink} {...(reportHref.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                Сообщите
              </a>
            ) : (
              "Сообщите"
            )}{" "}
            — исправим.
          </small>
          {site.instagramUrl ? (
            <small className={styles.footnote}>
              ** Instagram принадлежит компании Meta, признанной экстремистской организацией и запрещённой в России.
            </small>
          ) : null}
        </span>
        <nav className={styles.legal} aria-label="Документы">
          <Link href="/kabinet">Личный кабинет</Link>
          <Link href="/privacy">Политика конфиденциальности</Link>
          <Link href="/soglasie">Согласие на обработку данных</Link>
          <CookieSettingsButton className={styles.cookieButton} />
        </nav>
      </div>
    </footer>
  );
}
