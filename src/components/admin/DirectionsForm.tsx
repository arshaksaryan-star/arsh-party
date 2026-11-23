"use client";

import { useActionState } from "react";
import { saveDirections } from "@/app/admin/actions";
import type { Direction, DirectionSlug } from "@/content/directions";
import { faqToText, formatsToText, type DirectionPage } from "@/content/direction-pages";
import { Star } from "@/components/ui/Star";
import { FormMessage, SubmitButton } from "./FormParts";
import styles from "./admin.module.css";

type Props = { directions: Direction[]; pages: Record<DirectionSlug, DirectionPage>; disabled: boolean };

export function DirectionsForm({ directions, pages, disabled }: Props) {
  const [state, formAction] = useActionState(saveDirections, null);

  return (
    <form action={formAction} className={styles.main} style={{ paddingBlock: 0 }}>
      {directions.map((direction) => {
        const name = (key: string) => `${direction.slug}.${key}`;
        return (
          <fieldset key={direction.slug} className={styles.card} disabled={disabled}>
            <legend className={styles.cardTitle} style={{ float: "left", width: "100%" }}>
              <Star color={direction.star} className={styles.cardStar} />
              {direction.title}
            </legend>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>Название</span>
                <input name={name("title")} defaultValue={direction.title} className={styles.input} maxLength={160} required />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Короткое имя</span>
                <input name={name("short")} defaultValue={direction.short} className={styles.input} maxLength={20} required />
                <span className={styles.hint}>Подпись под звездой в созвездии, до 12 символов смотрится лучше</span>
              </label>
              <label className={`${styles.field} ${styles.wide}`}>
                <span className={styles.label}>Строка пользы</span>
                <textarea name={name("tagline")} defaultValue={direction.tagline} className={`${styles.input} ${styles.textarea}`} maxLength={160} required />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Теги</span>
                <input name={name("tags")} defaultValue={direction.tags.join(", ")} className={styles.input} />
                <span className={styles.hint}>Через запятую, до 6 штук</span>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Текст кнопки</span>
                <input name={name("cta")} defaultValue={direction.cta} className={styles.input} maxLength={40} required />
              </label>
            </div>

            <details className={styles.pageDetails}>
              <summary className={styles.pageSummary}>Страница /{direction.slug}</summary>
              <div className={styles.grid2}>
                <label className={`${styles.field} ${styles.wide}`}>
                  <span className={styles.label}>Текст под заголовком</span>
                  <textarea name={name("page.lead")} defaultValue={pages[direction.slug].lead} className={`${styles.input} ${styles.textarea}`} maxLength={600} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Что входит</span>
                  <textarea name={name("page.included")} defaultValue={pages[direction.slug].included.join("\n")} className={`${styles.input} ${styles.textareaTall}`} />
                  <span className={styles.hint}>По пункту на строку</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Как это проходит</span>
                  <textarea name={name("page.steps")} defaultValue={pages[direction.slug].steps.join("\n")} className={`${styles.input} ${styles.textareaTall}`} />
                  <span className={styles.hint}>По шагу на строку, в нужном порядке</span>
                </label>
                <label className={`${styles.field} ${styles.wide}`}>
                  <span className={styles.label}>Форматы и цены</span>
                  <textarea name={name("page.formats")} defaultValue={formatsToText(pages[direction.slug].formats)} className={`${styles.input} ${styles.textareaTall}`} />
                  <span className={styles.hint}>
                    Строка на формат: Название | Описание | Цена. Например: «Фуршет | Закуски и горячее с мангала | от 1 500 ₽ на гостя». Без цены
                    на сайте будет «Цена по запросу»
                  </span>
                </label>
                <label className={`${styles.field} ${styles.wide}`}>
                  <span className={styles.label}>Частые вопросы</span>
                  <textarea name={name("page.faq")} defaultValue={faqToText(pages[direction.slug].faq)} className={`${styles.input} ${styles.textareaTall}`} />
                  <span className={styles.hint}>Вопрос на первой строке, ответ на следующей. Между вопросами — пустая строка</span>
                </label>
              </div>
            </details>
          </fieldset>
        );
      })}

      <div className={styles.actions}>
        <SubmitButton>Сохранить</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
