"use client";

import { useState } from "react";
import { formatDigits, phoneDigits } from "@/lib/phone-input";
import styles from "./PhoneInput.module.css";

type Props = {
  /** Класс обычного поля формы — рамка и размеры остаются как у соседних полей. */
  className?: string;
  /** Имя для формы: уходит скрытым полем в виде +79001234567 (пусто — если номер не ввели). */
  name?: string;
  defaultValue?: string | null;
  /** Управляемый режим: value и onChange в виде +79001234567. */
  value?: string;
  onChange?: (phone: string) => void;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  label?: string;
};

/** Телефон: «+7» уже стоит, человек сразу пишет номер. Вставка «8 (900) …» тоже работает. */
export function PhoneInput({ className, name, defaultValue, value, onChange, id, invalid, describedBy, label = "Номер телефона" }: Props) {
  const [own, setOwn] = useState(() => phoneDigits(defaultValue ?? ""));
  const digits = value !== undefined ? phoneDigits(value) : own;

  function set(next: string) {
    const clean = phoneDigits(next);
    if (value === undefined) setOwn(clean);
    onChange?.(clean ? `+7${clean}` : "");
  }

  return (
    <div className={`${className ?? ""} ${styles.box}`} aria-invalid={invalid || undefined}>
      <span className={styles.prefix} aria-hidden="true">
        +7
      </span>
      <input
        id={id}
        className={styles.input}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formatDigits(digits)}
        onChange={(event) => set(event.target.value)}
        onPaste={(event) => {
          event.preventDefault();
          set(event.clipboardData.getData("text"));
        }}
        placeholder="900 123-45-67"
        aria-label={`${label}: 10 цифр после +7`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      {name ? <input type="hidden" name={name} value={digits ? `+7${digits}` : ""} /> : null}
    </div>
  );
}
