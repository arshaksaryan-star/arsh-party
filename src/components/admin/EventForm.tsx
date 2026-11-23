"use client";

import { useActionState } from "react";
import { saveEvent } from "@/app/admin/actions";
import { defaultDirections } from "@/content/directions";
import { vkWatchUrl, type EventRow } from "@/lib/events";
import { FormMessage, SubmitButton } from "./FormParts";
import { DateField } from "./DateField";
import styles from "./admin.module.css";

export function EventForm({ event, disabled }: { event: EventRow | null; disabled: boolean }) {
  const [state, formAction] = useActionState(saveEvent, null);
  return (
    <form action={formAction} className={styles.card}>
      <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        {event ? <input type="hidden" name="id" value={event.id} /> : null}
        <h2 className={styles.cardTitle}>Описание</h2>
        <div className={styles.grid2}>
          <label className={`${styles.field} ${styles.wide}`}>
            <span className={styles.label}>Название</span>
            <input name="title" defaultValue={event?.title ?? ""} className={styles.input} required minLength={2} maxLength={120} placeholder="Например, Свадьба в Солотче" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Звезда направления</span>
            <select name="direction" defaultValue={event?.direction ?? "catering"} className={styles.input}>
              {defaultDirections.map((direction) => (
                <option key={direction.slug} value={direction.slug}>
                  {direction.title}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.field}>
            <span className={styles.label}>Дата</span>
            <DateField name="event_date" defaultValue={event?.event_date ?? null} label="Дата праздника" />
            <span className={styles.hint}>На сайте покажем месяц и год</span>
          </div>
          <label className={`${styles.field} ${styles.wide}`}>
            <span className={styles.label}>Место</span>
            <input name="place" defaultValue={event?.place ?? ""} className={styles.input} maxLength={120} placeholder="Солотча, загородный клуб" />
          </label>
          <label className={`${styles.field} ${styles.wide}`}>
            <span className={styles.label}>Пара слов о празднике</span>
            <textarea name="summary" defaultValue={event?.summary ?? ""} className={`${styles.input} ${styles.textarea}`} maxLength={600} placeholder="Свадьба на 60 гостей: фуршет, шашлык на месте, фруктовая тарелка" />
            <span className={styles.hint}>Показывается на первом слайде истории</span>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Цитата из отзыва</span>
            <textarea name="quote" defaultValue={event?.quote ?? ""} className={`${styles.input} ${styles.textarea}`} maxLength={400} />
            <span className={styles.hint}>Последний слайд истории и подпись карточки. Лучше одной фразой</span>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Автор отзыва</span>
            <input name="quote_author" defaultValue={event?.quote_author ?? ""} className={styles.input} maxLength={80} placeholder="Алёна · отзыв на Яндекс Картах" />
          </label>
          <label className={`${styles.field} ${styles.wide}`}>
            <span className={styles.label}>Видео из VK Видео</span>
            <textarea
              name="videos"
              defaultValue={(event?.videos ?? []).map(vkWatchUrl).join("\n")}
              className={`${styles.input} ${styles.textarea}`}
              placeholder="https://vkvideo.ru/video-123456_789012"
            />
            <span className={styles.hint}>
              По ссылке на строку, до 5. Подойдёт обычная ссылка на ролик или код из «Поделиться → Экспортировать» — для закрытых
              роликов нужен именно код
            </span>
          </label>
          <label className={`${styles.check} ${styles.wide}`}>
            <input type="checkbox" name="is_published" defaultChecked={event?.is_published ?? false} /> Показывать на сайте
          </label>
        </div>
      </fieldset>
      <div className={styles.inlineActions}>
        <SubmitButton>{event ? "Сохранить" : "Создать и перейти к фото"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
