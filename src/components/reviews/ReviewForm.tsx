"use client";

import { useEffect, useRef, useState } from "react";
import { STAR_POINTS } from "@/components/ui/Star";
import {
  checkMediaFile,
  mediaKindOfType,
  REVIEW_LIMITS,
  REVIEW_MEDIA,
  REVIEW_MEDIA_ACCEPT,
  validateSiteReview,
  type SiteReviewErrors,
} from "@/lib/site-review";
import styles from "./ReviewForm.module.css";

/** Пять звёзд оценки — в цветах пяти направлений Arsh Party. */
const STAR_COLORS = ["orange", "red", "green", "pink", "blue"] as const;
const RATING_LABELS = ["", "Плохо", "Так себе", "Нормально", "Хорошо", "Отлично!"];

type Status = "idle" | "sending" | "done";
type Picked = { id: string; file: File; preview: string; kind: "image" | "video" };

/** Загружает файлы напрямую в хранилище по ссылкам с сервера и возвращает их пути. */
async function uploadFiles(files: File[], onProgress: (done: number) => void): Promise<string[]> {
  const response = await fetch("/api/review/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: files.map((file) => ({ type: file.type, size: file.size })) }),
  });
  const data = (await response.json().catch(() => ({}))) as { uploads?: { path: string; uploadUrl: string }[]; error?: string };
  if (!response.ok || !data.uploads) throw new Error(data.error ?? "Не получилось загрузить файлы.");
  const paths: string[] = [];
  for (const [index, upload] of data.uploads.entries()) {
    const file = files[index];
    const put = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type, "x-upsert": "false" },
      body: file,
    });
    if (!put.ok) throw new Error(`Файл «${file.name}» не загрузился. Попробуйте ещё раз.`);
    paths.push(upload.path);
    onProgress(index + 1);
  }
  return paths;
}

export function ReviewForm() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<SiteReviewErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const startedAt = useRef(Date.now());
  const [picked, setPicked] = useState<Picked[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // Освобождаем превью, когда файл убран или форма закрыта.
  const previews = useRef<string[]>([]);
  previews.current = picked.map((item) => item.preview);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFileError(null);
    const next = [...picked];
    for (const file of Array.from(list)) {
      if (next.length >= REVIEW_MEDIA.maxFiles) {
        setFileError(`Можно прикрепить до ${REVIEW_MEDIA.maxFiles} файлов`);
        break;
      }
      const problem = checkMediaFile(file);
      if (problem) {
        setFileError(`«${file.name}»: ${problem}`);
        continue;
      }
      next.push({ id: `${file.name}-${file.size}-${file.lastModified}`, file, preview: URL.createObjectURL(file), kind: mediaKindOfType(file.type) ?? "image" });
    }
    setPicked(next);
  }

  function removeFile(id: string) {
    setPicked((list) => {
      const item = list.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return list.filter((entry) => entry.id !== id);
    });
  }
  const shown = hover || rating;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      text: form.get("text"),
      rating,
      consent: form.get("consent") === "on",
      website: form.get("website"),
      startedAt: startedAt.current,
    };
    const check = validateSiteReview(payload);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setServerError(null);
    setStatus("sending");
    try {
      let media: string[] = [];
      if (picked.length > 0) {
        setProgress(`Загружаем файлы: 0 из ${picked.length}`);
        try {
          media = await uploadFiles(
            picked.map((item) => item.file),
            (done) => setProgress(`Загружаем файлы: ${done} из ${picked.length}`),
          );
        } catch (error) {
          setServerError(error instanceof Error ? error.message : "Не получилось загрузить файлы.");
          setProgress(null);
          setStatus("idle");
          return;
        }
      }
      setProgress(null);
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, media }),
      });
      const data = (await response.json().catch(() => ({}))) as { errors?: SiteReviewErrors; error?: string };
      if (response.ok) {
        setStatus("done");
        return;
      }
      if (data.errors) setErrors(data.errors);
      setServerError(data.error ?? "Не получилось отправить. Попробуйте ещё раз.");
    } catch {
      setServerError("Нет связи. Проверьте интернет и попробуйте ещё раз.");
    }
    setProgress(null);
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <div className={styles.done} role="status">
        <svg viewBox="0 0 100 100" className={styles.doneStar} aria-hidden="true">
          <polygon points={STAR_POINTS} />
        </svg>
        <p className={styles.doneTitle}>Спасибо! Отзыв у нас</p>
        <p className={styles.doneText}>Мы прочитаем его и опубликуем на сайте в ближайшее время.</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.rating}>
        <legend className={styles.label}>Ваша оценка</legend>
        <div className={styles.stars} onMouseLeave={() => setHover(0)}>
          {STAR_COLORS.map((color, index) => {
            const value = index + 1;
            return (
              <label
                key={value}
                className={styles.starLabel}
                onMouseEnter={() => setHover(value)}
                style={{ "--c": `var(--c-${color})` } as React.CSSProperties}
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="visually-hidden"
                  aria-label={`${value} из 5`}
                />
                <svg viewBox="0 0 100 100" className={`${styles.star} ${value <= shown ? styles.starOn : ""}`} aria-hidden="true">
                  <polygon points={STAR_POINTS} />
                </svg>
              </label>
            );
          })}
          <span className={styles.ratingText} aria-hidden="true">
            {RATING_LABELS[shown]}
          </span>
        </div>
        {errors.rating ? <p className={styles.error}>{errors.rating}</p> : null}
      </fieldset>

      <label className={styles.field}>
        <span className={styles.label}>Как вас подписать</span>
        <input
          name="name"
          className={styles.input}
          autoComplete="given-name"
          maxLength={REVIEW_LIMITS.nameMax}
          placeholder="Например, Анна"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <span className={styles.error}>{errors.name}</span> : null}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Отзыв</span>
        <textarea
          name="text"
          className={`${styles.input} ${styles.textarea}`}
          maxLength={REVIEW_LIMITS.textMax}
          placeholder="Какой был праздник, что понравилось, что улучшить"
          aria-invalid={Boolean(errors.text)}
        />
        {errors.text ? <span className={styles.error}>{errors.text}</span> : null}
      </label>

      <div className={styles.field}>
        <span className={styles.label}>Фото или видео с праздника — по желанию</span>
        {picked.length > 0 ? (
          <ul className={styles.files}>
            {picked.map((item) => (
              <li key={item.id} className={styles.fileItem}>
                {item.kind === "video" ? (
                  <video src={item.preview} muted playsInline preload="metadata" className={styles.fileThumb} />
                ) : (
                  <img src={item.preview} alt="" className={styles.fileThumb} />
                )}
                {item.kind === "video" ? (
                  <span className={styles.fileBadge} aria-hidden="true">
                    ▶
                  </span>
                ) : null}
                <button type="button" className={styles.fileRemove} onClick={() => removeFile(item.id)} aria-label={`Убрать «${item.file.name}»`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {picked.length < REVIEW_MEDIA.maxFiles ? (
          <label className={styles.attach}>
            <input
              type="file"
              accept={REVIEW_MEDIA_ACCEPT}
              multiple
              className="visually-hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <span aria-hidden="true">＋</span> Прикрепить файл
          </label>
        ) : null}
        <span className={styles.hint}>До {REVIEW_MEDIA.maxFiles} файлов: фото до 10 МБ, видео до 50 МБ</span>
        {fileError ? <span className={styles.error}>{fileError}</span> : null}
        {errors.media ? <span className={styles.error}>{errors.media}</span> : null}
      </div>

      {/* Ловушка для ботов: люди это поле не видят */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.trap} aria-hidden="true" />

      <label className={styles.consent}>
        <input type="checkbox" name="consent" />
        <span>
          Даю{" "}
          <a href="/soglasie" target="_blank" rel="noopener">
            согласие на обработку персональных данных
          </a>{" "}
          на условиях{" "}
          <a href="/privacy" target="_blank" rel="noopener">
            Политики конфиденциальности
          </a>{" "}
          и согласен, чтобы мой отзыв с именем (фамилия — только первой буквой) и прикреплёнными фото или видео был опубликован на
          сайте Arsh Party
        </span>
      </label>
      {errors.consent ? <p className={styles.error}>{errors.consent}</p> : null}

      {serverError ? (
        <p className={styles.serverError} role="alert">
          {serverError}
        </p>
      ) : null}

      <button type="submit" className={styles.submit} disabled={status === "sending"}>
        {status === "sending" ? (progress ?? "Отправляем…") : "Отправить отзыв"}
      </button>
    </form>
  );
}
