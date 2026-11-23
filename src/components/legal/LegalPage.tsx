import Link from "next/link";
import { fillLegal, LEGAL_UPDATED, type LegalRequisites, type LegalSection } from "@/content/legal";
import styles from "./legal.module.css";

const LABELLED = /^(Цель|Категории и перечень обрабатываемых данных|Категории субъектов, персональные данные которых обрабатываются|Способы обработки|Срок обработки и хранения|Порядок уничтожения персональных данных при достижении цели их обработки или при наступлении иных законных оснований):\s*/;

/** Абзац документа: «а) …» — пункт списка, «Цель: …» — с жирной подписью. */
function Item({ text }: { text: string }) {
  const label = LABELLED.exec(text);
  if (label) {
    const isGoal = label[1] === "Цель";
    return (
      <p className={isGoal ? styles.goal : styles.p}>
        <b>{label[1]}:</b> {text.slice(label[0].length)}
      </p>
    );
  }
  if (/^[а-г]\)\s/.test(text)) return <p className={styles.sub}>{text}</p>;
  return <p className={styles.p}>{text}</p>;
}

type Props = {
  title: string;
  lead?: string;
  sections: LegalSection[];
  requisites: LegalRequisites;
  /** Показать оглавление (для длинной политики). */
  toc?: boolean;
  /** Ссылки на соседние документы внизу. */
  related: { href: string; label: string }[];
};

export function LegalPage({ title, lead, sections, requisites, toc = false, related }: Props) {
  const missing = !requisites.operatorName || !requisites.inn || !requisites.email;
  return (
    <article className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Документы Arsh Party</p>
        <h1 className={styles.title}>{title}</h1>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
        <p className={styles.updated}>Редакция от {LEGAL_UPDATED}</p>
        {missing ? (
          <p className={styles.warning} role="note">
            Реквизиты оператора ещё не заполнены — они появятся здесь после заполнения в админке.
          </p>
        ) : null}
      </header>

      {toc ? (
        <nav className={styles.toc} aria-label="Содержание">
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
            <li>
              <a href="#requisites">Реквизиты Оператора</a>
            </li>
          </ol>
        </nav>
      ) : null}

      <div className={styles.body}>
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className={styles.section}>
            {sections.length > 1 ? (
              <h2 className={styles.h2}>
                <span className={styles.num}>{index + 1}</span>
                {section.title}
              </h2>
            ) : null}
            {section.items.map((item, n) => (
              <Item key={n} text={fillLegal(item, requisites)} />
            ))}
          </section>
        ))}

        <section id="requisites" className={styles.section}>
          <h2 className={styles.h2}>Реквизиты Оператора</h2>
          <dl className={styles.requisites}>
            <dt>Оператор</dt>
            <dd>Индивидуальный предприниматель {fillLegal("{operatorName}", requisites)}</dd>
            <dt>ИНН</dt>
            <dd>{fillLegal("{inn}", requisites)}</dd>
            <dt>ОГРНИП</dt>
            <dd>{fillLegal("{ogrnip}", requisites)}</dd>
            <dt>Адрес</dt>
            <dd>{fillLegal("{address}", requisites)}</dd>
            <dt>E-mail для обращений</dt>
            <dd>{requisites.email ? <a href={`mailto:${requisites.email}`}>{requisites.email}</a> : fillLegal("{email}", requisites)}</dd>
            <dt>Сайт</dt>
            <dd>{fillLegal("{siteUrl}", requisites)}</dd>
          </dl>
        </section>
      </div>

      <nav className={styles.related} aria-label="Другие документы">
        {related.map((link) => (
          <Link key={link.href} href={link.href} className={styles.relatedLink}>
            {link.label} →
          </Link>
        ))}
      </nav>
    </article>
  );
}
