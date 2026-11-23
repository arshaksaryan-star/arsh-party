"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

/**
 * Видео-кружок Арша: приветствие на главной (slot = greeting) или «объясняю за минуту»
 * на странице звезды (slot = sshp и т. п.). Загрузка с полосой прогресса, сервер сам
 * обрежет видео в квадрат и сожмёт.
 */
export function CircleUploader({
  slot,
  title,
  hint,
  video,
  poster,
  hidden = false,
  disabled,
}: {
  slot: string;
  title: string;
  hint: string;
  video: string | null;
  poster: string | null;
  hidden?: boolean;
  disabled: boolean;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function upload(file: File) {
    setMessage(null);
    if (!/^video\/(mp4|quicktime|webm)$/.test(file.type)) {
      setMessage({ ok: false, text: "Нужно видео: mp4, mov или webm" });
      return;
    }
    if (file.size > 300 * 1024 * 1024) {
      setMessage({ ok: false, text: "Видео больше 300 МБ — запишите покороче" });
      return;
    }
    const request = new XMLHttpRequest();
    request.open("PUT", `/api/admin/circle?slot=${encodeURIComponent(slot)}`);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.upload.onload = () => setProgress(100);
    request.onload = () => {
      setProgress(null);
      let data: { error?: string; converted?: boolean } = {};
      try {
        data = JSON.parse(request.responseText);
      } catch {
        // ответ не JSON — покажем общую ошибку
      }
      if (request.status >= 200 && request.status < 300) {
        setMessage({ ok: true, text: data.converted ? "Готово: видео обрезано в кружок и уже на сайте." : "Готово: видео уже на сайте." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: data.error ?? "Видео не загрузилось. Попробуйте ещё раз." });
      }
    };
    request.onerror = () => {
      setProgress(null);
      setMessage({ ok: false, text: "Нет связи. Проверьте интернет и попробуйте ещё раз." });
    };
    request.send(file);
  }

  async function toggleHidden() {
    const response = await fetch(`/api/admin/circle?slot=${encodeURIComponent(slot)}&hidden=${hidden ? "0" : "1"}`, { method: "PATCH" });
    if (response.ok) {
      setMessage({ ok: true, text: hidden ? "Кружок снова на сайте." : "Кружок убран с сайта. Видео сохранено — вернёте одной кнопкой." });
      router.refresh();
    } else {
      setMessage({ ok: false, text: "Не получилось сохранить." });
    }
  }

  async function remove() {
    if (!window.confirm("Удалить видео совсем? Чтобы просто спрятать, нажмите «Убрать с сайта».")) return;
    const response = await fetch(`/api/admin/circle?slot=${encodeURIComponent(slot)}`, { method: "DELETE" });
    if (response.ok) {
      setMessage({ ok: true, text: "Видео убрано." });
      router.refresh();
    } else {
      setMessage({ ok: false, text: "Не получилось убрать видео." });
    }
  }

  return (
    <section className={styles.card}>
      <p className={styles.cardTitle}>
        {title}
        {video ? <span className={styles.itemMeta}> · {hidden ? "скрыт с сайта" : "на сайте"}</span> : null}
      </p>
      <p className={styles.itemMeta}>{hint}</p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
        <div style={{ width: 120, height: 120, borderRadius: "50%", overflow: "hidden", background: "#000", flex: "none" }}>
          {video ? (
            <video src={video} poster={poster ?? undefined} muted loop autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <img src="/photos/arsh-ok.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label className={styles.primary} style={{ cursor: disabled || progress !== null ? "not-allowed" : "pointer" }}>
            {progress !== null ? `Загружаем… ${progress}%` : video ? "Заменить видео" : "Загрузить видео"}
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              hidden
              disabled={disabled || progress !== null}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) upload(file);
              }}
            />
          </label>
          {video ? (
            <button type="button" className={hidden ? styles.primary : styles.secondary} onClick={toggleHidden} disabled={disabled || progress !== null}>
              {hidden ? "Вернуть на сайт" : "Убрать с сайта"}
            </button>
          ) : null}
          {video ? (
            <button type="button" className={styles.secondary} onClick={remove} disabled={disabled || progress !== null}>
              Удалить видео
            </button>
          ) : null}
        </div>
      </div>
      {progress === 100 ? <p className={styles.itemMeta}>Видео на сервере, обрезаем в кружок — до минуты…</p> : null}
      {message ? <p className={message.ok ? styles.itemMeta : styles.notice}>{message.text}</p> : null}
    </section>
  );
}
