"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/admin/actions";
import styles from "./admin.module.css";

/** Кнопка отправки: сама знает, что форма отправляется. */
export function SubmitButton({ children, pendingText = "Сохраняем…" }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.primary} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Результат сохранения рядом с кнопкой. */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p className={`${styles.message} ${state.ok ? styles.messageOk : styles.messageError}`} role={state.ok ? "status" : "alert"}>
      {state.message}
    </p>
  );
}
