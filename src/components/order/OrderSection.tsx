import { defaultDirections, type DirectionSlug } from "@/content/directions";
import { phoneHref } from "@/content/site";
import { getContent } from "@/lib/content";
import { LeadForm } from "./LeadForm";
import styles from "./OrderSection.module.css";

/** Раздел с формой заявки. Якоря #order-<направление> прокручивают сюда и выбирают звезду. */
type OrderSectionProps = {
  /** На странице звезды форма сразу открывается с этим направлением. */
  direction?: DirectionSlug;
  title?: string;
};

export async function OrderSection({ direction, title = "Расскажите о празднике" }: OrderSectionProps = {}) {
  const { site } = await getContent();
  return (
    <section className={`container ${styles.section}`} aria-labelledby="order-title" id="order">
      {defaultDirections.map((direction) => (
        <span key={direction.slug} id={`order-${direction.slug}`} className={styles.anchor} aria-hidden="true" />
      ))}

      <div className={styles.grid}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Заявка</p>
          <h2 id="order-title" className={styles.heading}>
            {title}
          </h2>
          <p className={styles.text}>
            Перезвоним, уточним детали и предложим формат под ваш бюджет. Работаем в Рязани и по всему Центральному
            федеральному округу.
          </p>
          <ul className={styles.points}>
            <li>Заявка ни к чему не обязывает</li>
            <li>Меню и программа под ваш повод</li>
            <li>Выезд по Рязани, области и ЦФО</li>
          </ul>
          {site.phone ? (
            <p className={styles.call}>
              Быстрее голосом: <a href={phoneHref(site.phone)}>{site.phone}</a>
            </p>
          ) : null}
        </div>
        <LeadForm initialDirection={direction} />
      </div>
    </section>
  );
}
