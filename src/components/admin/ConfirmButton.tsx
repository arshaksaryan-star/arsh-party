"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/** Кнопка с подтверждением внутри страницы: первое нажатие спрашивает, второе отправляет форму. */
export function ConfirmButton({ label, confirmLabel, className }: { label: string; confirmLabel: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  if (!armed) {
    return (
      <button type="button" className={className} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      <button type="submit" className={className} disabled={pending}>
        {pending ? "…" : confirmLabel}
      </button>
      <button type="button" className={className?.split(" ")[0]} onClick={() => setArmed(false)}>
        Отмена
      </button>
    </span>
  );
}
