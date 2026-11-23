"use client";

import { useActionState, useState } from "react";
import { resetArshPhoto, uploadArshPhoto } from "@/app/admin/actions";
import type { PhotoSlot } from "@/content/photos";
import { FormMessage, SubmitButton } from "./FormParts";
import styles from "./admin.module.css";

type Item = { slot: PhotoSlot; label: string; hint: string; current: string; custom: boolean };

/** Уменьшаем снимок в браузере до 2000 px по длинной стороне: фото с телефона весят 5–10 МБ. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 1_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

function PhotoSlotCard({ item, disabled }: { item: Item; disabled: boolean }) {
  const [state, action] = useActionState(uploadArshPhoto, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  return (
    <article className={styles.card}>
      <p className={styles.cardTitle}>{item.label}</p>
      <p className={styles.hint}>
        {item.hint}
        {item.custom ? " · загружено вами" : " · фото по умолчанию"}
      </p>
      <img src={preview ?? item.current} alt="" className={styles.photoPreview} style={{ width: 180, height: 180, objectFit: "cover" }} />
      <form
        action={(formData) => {
          if (file) formData.set("photo", file);
          action(formData);
        }}
        className={styles.inlineActions}
      >
        <input type="hidden" name="slot" value={item.slot} />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (event) => {
            const picked = event.target.files?.[0];
            if (!picked) return;
            const small = await shrink(picked);
            setFile(small);
            setPreview(URL.createObjectURL(small));
          }}
        />
        {disabled || !file ? (
          <button type="button" className={styles.primary} disabled>
            Заменить
          </button>
        ) : (
          <SubmitButton pendingText="Загружаем…">Заменить</SubmitButton>
        )}
      </form>
      <FormMessage state={state} />
      {item.custom ? (
        <form action={resetArshPhoto}>
          <input type="hidden" name="slot" value={item.slot} />
          <button type="submit" className={styles.secondary} disabled={disabled}>
            Вернуть фото по умолчанию
          </button>
        </form>
      ) : null}
    </article>
  );
}

export function ArshPhotos({ items, disabled }: { items: Item[]; disabled: boolean }) {
  return (
    <div className={styles.photoGrid} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      {items.map((item) => (
        <PhotoSlotCard key={item.slot} item={item} disabled={disabled} />
      ))}
    </div>
  );
}
