"use client";

import { useActionState } from "react";
import { enterZvezda, type GateState } from "@/app/(site)/zvezda/actions";
import { Star } from "@/components/ui/Star";
import styles from "./zvezda.module.css";

/** Вход на тайную страницу: пароль с визитки Арша. */
export function ZvezdaGate({ oops }: { oops: boolean }) {
  const [state, action, pending] = useActionState<GateState, FormData>(enterZvezda, oops ? { error: "Ссылка устарела — введите пароль с визитки." } : null);
  return (
    <form action={action} className={styles.gate}>
      <Star className={styles.heroStar} />
      <p className={styles.heroEyebrow}>Тайная звезда</p>
      <p className={styles.heroText} style={{ margin: 0 }}>
        Сюда попадают с визиткой Арша. Введите пароль с её обратной стороны.
      </p>
      <input name="password" className={styles.gateInput} autoComplete="off" autoCapitalize="none" aria-label="Пароль" placeholder="пароль" required />
      {state?.error ? (
        <p className={styles.gateError} role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={styles.gateButton} disabled={pending}>
        {pending ? "Открываем…" : "Открыть"}
      </button>
      <p className={styles.gateHint}>Визитки нет? Спросите у Арша на празднике 😉</p>
    </form>
  );
}
