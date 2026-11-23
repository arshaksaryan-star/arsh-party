"use client";

import { useActionState } from "react";
import { kitchenLogin } from "@/app/kitchen/actions";
import { FormMessage, SubmitButton } from "@/components/admin/FormParts";
import styles from "@/components/admin/admin.module.css";

export function KitchenLogin() {
  const [state, formAction] = useActionState(kitchenLogin, null);
  return (
    <form action={formAction} className={styles.loginCard}>
      <img src="/brand/arsh-party.svg" alt="Arsh Party" width={1280} height={668} className={styles.loginLogo} />
      <h1 className={styles.loginTitle}>Кухня</h1>
      <p className={styles.hint}>Отметьте, что сегодня на огне. Пароль кухни выдаёт владелец.</p>
      <label className={styles.field}>
        <span className={styles.label}>Пароль кухни</span>
        <input className={styles.input} type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Проверяем…">Войти</SubmitButton>
    </form>
  );
}
