"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { FormMessage, SubmitButton } from "./FormParts";
import styles from "./admin.module.css";

export function LoginForm() {
  const [state, formAction] = useActionState(login, null);
  return (
    <form action={formAction} className={styles.loginCard}>
      <img src="/brand/arsh-party.svg" alt="Arsh Party" width={1280} height={668} className={styles.loginLogo} />
      <h1 className={styles.loginTitle}>Вход в админку</h1>
      <label className={styles.field}>
        <span className={styles.label}>Пароль</span>
        <input
          className={styles.input}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          autoFocus
        />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Проверяем…">Войти</SubmitButton>
    </form>
  );
}
