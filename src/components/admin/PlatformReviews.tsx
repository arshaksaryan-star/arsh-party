"use client";

import { useActionState, useState } from "react";
import { deleteReviewItem, saveReviewItem, saveReviewPlatforms } from "@/app/admin/actions";
import { defaultDirections } from "@/content/directions";
import type { ReviewPlatform } from "@/content/reviews";
import { DateField } from "./DateField";
import { FormMessage, SubmitButton } from "./FormParts";
import styles from "./admin.module.css";

export type EditableReview = {
  id: string;
  author: string;
  date: string;
  platform: "yandex" | "2gis";
  rating: number | null;
  text: string;
  directions: string[];
  hidden: boolean;
};

function Platforms({ platforms, disabled }: { platforms: ReviewPlatform[]; disabled: boolean }) {
  const [state, action] = useActionState(saveReviewPlatforms, null);
  return (
    <form action={action} className={styles.card}>
      <p className={styles.cardTitle}>Оценки на площадках</p>
      <p className={styles.hint}>Показываются в блоке «Что говорят после», в «О нас» и на странице /otziv. Обновляйте раз в месяц.</p>
      {platforms.map((platform) => (
        <div key={platform.id} className={styles.inlineActions}>
          <b style={{ minWidth: 110 }}>{platform.name}</b>
          <input className={styles.input} name={`${platform.id}_rating`} defaultValue={String(platform.rating).replace(".", ",")} inputMode="decimal" style={{ maxWidth: 80 }} aria-label={`Оценка ${platform.name}`} />
          <input className={styles.input} name={`${platform.id}_label`} defaultValue={platform.ratingsLabel} style={{ maxWidth: 160 }} aria-label={`Подпись ${platform.name}`} />
        </div>
      ))}
      <div className={styles.actions}>
        {disabled ? null : <SubmitButton>Сохранить оценки</SubmitButton>}
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function ReviewForm({ review, disabled, onDone }: { review: EditableReview | null; disabled: boolean; onDone?: () => void }) {
  const [state, action] = useActionState(async (prev: Parameters<typeof saveReviewItem>[0], formData: FormData) => {
    const result = await saveReviewItem(prev, formData);
    if (result?.ok && !review) onDone?.();
    return result;
  }, null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className={styles.card}>
      <input type="hidden" name="id" value={review?.id ?? ""} />
      <div className={styles.grid2}>
        <label className={styles.field}>
          <span className={styles.label}>Автор, как на площадке</span>
          <input className={styles.input} name="author" defaultValue={review?.author ?? ""} maxLength={80} />
        </label>
        <div className={styles.field}>
          <span className={styles.label}>Дата</span>
          <DateField name="date" defaultValue={review?.date ?? today} required label="Дата отзыва" />
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Площадка</span>
          <select className={styles.input} name="platform" defaultValue={review?.platform ?? "yandex"}>
            <option value="yandex">Яндекс Карты</option>
            <option value="2gis">2ГИС</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Оценка</span>
          <select className={styles.input} name="rating" defaultValue={review?.rating ? String(review.rating) : "5"}>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {"★".repeat(value)}
              </option>
            ))}
            <option value="">без оценки</option>
          </select>
        </label>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Текст отзыва — дословно, с орфографией автора</span>
        <textarea className={`${styles.input} ${styles.textarea}`} name="text" defaultValue={review?.text ?? ""} rows={4} maxLength={2000} />
      </label>
      <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className={styles.label}>Показывать на страницах звёзд</legend>
        <div className={styles.inlineActions}>
          {defaultDirections.map((direction) => (
            <label key={direction.slug} className={styles.check}>
              <input type="checkbox" name="directions" value={direction.slug} defaultChecked={review?.directions.includes(direction.slug)} /> {direction.short}
            </label>
          ))}
        </div>
      </fieldset>
      {review ? (
        <label className={styles.check}>
          <input type="checkbox" name="hidden" defaultChecked={review.hidden} /> Скрыть с сайта
        </label>
      ) : null}
      <div className={styles.actions}>
        {disabled ? null : <SubmitButton>{review ? "Сохранить" : "Добавить отзыв"}</SubmitButton>}
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PlatformReviews({ platforms, reviews, disabled }: { platforms: ReviewPlatform[]; reviews: EditableReview[]; disabled: boolean }) {
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <>
      <Platforms platforms={platforms} disabled={disabled} />

      <div className={styles.toolbar}>
        <button type="button" className={styles.primary} onClick={() => setAdding((value) => !value)} disabled={disabled}>
          {adding ? "Закрыть" : "+ Отзыв с площадки"}
        </button>
        <span className={styles.itemMeta}>Отзывов: {reviews.length}</span>
      </div>
      {adding ? <ReviewForm review={null} disabled={disabled} onDone={() => setAdding(false)} /> : null}

      {reviews.map((review) => (
        <div key={review.id}>
          <article className={styles.card}>
            <p className={styles.itemMeta}>
              {review.platform === "yandex" ? "Яндекс" : "2ГИС"} · {review.date}
              {review.rating ? ` · ${"★".repeat(review.rating)}` : ""}
              {review.hidden ? " · скрыт" : ""}
            </p>
            <p className={styles.cardTitle}>{review.author}</p>
            <p className={styles.itemText} style={{ whiteSpace: "pre-wrap" }}>
              {review.text.length > 220 && openId !== review.id ? `${review.text.slice(0, 220)}…` : review.text}
            </p>
            <div className={styles.inlineActions}>
              <button type="button" className={styles.secondary} onClick={() => setOpenId(openId === review.id ? null : review.id)}>
                {openId === review.id ? "Свернуть" : "Править"}
              </button>
              <form action={deleteReviewItem}>
                <input type="hidden" name="id" value={review.id} />
                <button
                  type="submit"
                  className={`${styles.secondary} ${styles.danger}`}
                  disabled={disabled}
                  onClick={(event) => {
                    if (!window.confirm(`Удалить отзыв ${review.author}?`)) event.preventDefault();
                  }}
                >
                  Удалить
                </button>
              </form>
            </div>
          </article>
          {openId === review.id ? <ReviewForm review={review} disabled={disabled} /> : null}
        </div>
      ))}
    </>
  );
}
