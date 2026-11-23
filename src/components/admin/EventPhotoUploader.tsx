"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadEventPhoto } from "@/app/admin/actions";
import styles from "./admin.module.css";

const MAX_SIDE = 1920;
const QUALITY = 0.82;

/** Уменьшает фото в браузере до 1920 px по длинной стороне: снимок с телефона в 8 МБ становится ~400 КБ. */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  // Уменьшать нечего (снимок и так маленький) — отправляем как есть.
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** Несколько фото за раз; на сервер уходят по одному, с прогрессом. */
export function EventPhotoUploader({ eventId, left }: { eventId: string; left: number }) {
  const router = useRouter();
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list).slice(0, left);
    const problems: string[] = [];
    if (list.length > left) problems.push(`Загружу первые ${left}: больше фото на праздник нельзя`);
    for (const [index, original] of files.entries()) {
      setProgress(`Загружаем ${index + 1} из ${files.length}…`);
      const file = await shrink(original);
      const data = new FormData();
      data.set("id", eventId);
      data.set("photo", file);
      const result = await uploadEventPhoto(null, data);
      if (result && !result.ok) problems.push(`«${original.name}»: ${result.message}`);
    }
    setProgress(null);
    setErrors(problems);
    router.refresh();
  }

  return (
    <div className={styles.field}>
      <label className={styles.primary} style={{ alignSelf: "flex-start", cursor: progress ? "progress" : "pointer" }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="visually-hidden"
          disabled={Boolean(progress)}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {progress ?? "＋ Добавить фото"}
      </label>
      <span className={styles.hint}>Можно выбрать сразу несколько. Большие снимки уменьшаются перед загрузкой, качество для сайта не страдает.</span>
      {errors.map((error) => (
        <span key={error} className={`${styles.message} ${styles.messageError}`}>
          {error}
        </span>
      ))}
    </div>
  );
}
