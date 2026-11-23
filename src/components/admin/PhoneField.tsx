"use client";

import { useState } from "react";
import { digitsLeftText, formatDigits, phoneDigits } from "@/lib/phone-input";
import styles from "./PhoneField.module.css";

/**
 * Телефон в админке: «+7» уже стоит, сразу пишется номер.
 * В форму уходит скрытое поле name в виде +79001234567 (или пусто, если номер не ввели).
 */
export function PhoneField({ name, defaultValue, label = "Телефон" }: { name: string; defaultValue?: string | null; label?: string }) {
  const [digits, setDigits] = useState(() => phoneDigits(defaultValue ?? ""));
  const incomplete = digits.length > 0 && digits.length < 10;

  return (
    <div className={styles.wrap}>
      <label className={styles.field} data-bad={incomplete || undefined}>
        <span className={styles.prefix} aria-hidden="true">
          +7
        </span>
        <input
          className={styles.input}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          value={formatDigits(digits)}
          onChange={(event) => setDigits(phoneDigits(event.target.value))}
          onPaste={(event) => {
            event.preventDefault();
            setDigits(phoneDigits(event.clipboardData.getData("text")));
          }}
          placeholder="900 123-45-67"
          aria-label={`${label}: 10 цифр после +7`}
        />
      </label>
      <input type="hidden" name={name} value={digits ? `+7${digits}` : ""} />
      {incomplete ? <span className={styles.hint}>{digitsLeftText(digits)}</span> : null}
    </div>
  );
}
