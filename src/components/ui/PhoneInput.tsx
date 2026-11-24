"use client";

import { useRef, useState } from "react";
import { formatDigits, phoneDigits } from "@/lib/phone-input";
import styles from "./PhoneInput.module.css";

type Props = {
  className?: string;
  name?: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (phone: string) => void;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  label?: string;
};

export function PhoneInput({ className, name, defaultValue, value, onChange, id, invalid, describedBy, label = "Номер телефона" }: Props) {
  const [own, setOwn] = useState(() => phoneDigits(defaultValue ?? ""));
  const digits = value !== undefined ? phoneDigits(value) : own;
  const inputRef = useRef<HTMLInputElement>(null);

  function set(next: string) {
    const clean = phoneDigits(next);
    if (value === undefined) setOwn(clean);
    onChange?.(clean ? `+7${clean}` : "");
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const cursor = input.selectionStart ?? 0;
    const rawValue = input.value;
    const rawDigits = phoneDigits(rawValue);
    const digitsBeforeCursor = phoneDigits(rawValue.slice(0, cursor)).length;

    set(rawValue);

    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let newCursor = 0;
      let digitCount = 0;
      const formatted = formatDigits(rawDigits);
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) digitCount++;
        if (digitCount > digitsBeforeCursor) break;
        newCursor = i + 1;
      }
      inputRef.current.setSelectionRange(newCursor, newCursor);
    });
  }

  return (
    <div className={`${className ?? ""} ${styles.box}`} aria-invalid={invalid || undefined}>
      <span className={styles.prefix} aria-hidden="true">
        +7
      </span>
      <input
        ref={inputRef}
        id={id}
        className={styles.input}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formatDigits(digits)}
        onChange={handleChange}
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
