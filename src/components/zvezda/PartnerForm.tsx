"use client";

import { useState } from "react";
import gift from "@/components/gift/gift.module.css";
import { PhoneInput } from "@/components/ui/PhoneInput";

/** «Есть дельное предложение?» — заявка о сотрудничестве Аршу. */
export function PartnerForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      phone: form.get("phone"),
      company: form.get("company"),
      message: form.get("message"),
      consent: form.get("consent") === "on",
      website: form.get("website"),
    };
    setServerError(null);
    setSending(true);
    try {
      const response = await fetch("/api/partner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await response.json().catch(() => ({}))) as { error?: string; errors?: Record<string, string> };
      if (response.ok) {
        setDone(true);
      } else {
        setErrors(data.errors ?? {});
        setServerError(data.error ?? "Не получилось отправить. Попробуйте ещё раз.");
      }
    } catch {
      setServerError("Нет связи. Проверьте интернет и попробуйте ещё раз.");
    }
    setSending(false);
  }

  if (done) {
    return (
      <div className={gift.done} role="status">
        <p className={gift.doneTitle}>Принято 🤝</p>
        <p className={gift.doneText}>Арш прочитает сам и ответит. Обычно — в течение пары дней.</p>
      </div>
    );
  }

  return (
    <form className={gift.form} onSubmit={submit} noValidate>
      <div className={gift.row}>
        <label className={gift.field}>
          <span className={gift.label}>Имя</span>
          <input className={gift.input} name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} />
          {errors.name ? <span className={gift.error}>{errors.name}</span> : null}
        </label>
        <label className={gift.field}>
          <span className={gift.label}>Телефон</span>
          <PhoneInput className={gift.input} name="phone" invalid={Boolean(errors.phone)} />
          {errors.phone ? <span className={gift.error}>{errors.phone}</span> : null}
        </label>
      </div>
      <label className={gift.field}>
        <span className={gift.label}>Компания или проект (необязательно)</span>
        <input className={gift.input} name="company" maxLength={120} autoComplete="organization" />
      </label>
      <label className={gift.field}>
        <span className={gift.label}>Что предлагаете</span>
        <textarea className={`${gift.input} ${gift.textarea}`} name="message" maxLength={2000} placeholder="Коротко: кто вы, что придумали и чем это полезно обеим сторонам" aria-invalid={Boolean(errors.message)} />
        {errors.message ? <span className={gift.error}>{errors.message}</span> : null}
      </label>
      <label className={gift.hidden} aria-hidden="true">
        Сайт
        <input tabIndex={-1} autoComplete="off" name="website" />
      </label>
      <label className={gift.consent}>
        <input type="checkbox" name="consent" aria-invalid={Boolean(errors.consent)} />
        <span>
          Даю{" "}
          <a href="/soglasie" target="_blank" rel="noopener">
            согласие на обработку персональных данных
          </a>
        </span>
      </label>
      {errors.consent ? <span className={gift.error}>{errors.consent}</span> : null}
      {serverError ? <p className={gift.serverError}>{serverError}</p> : null}
      <button type="submit" className={gift.submit} disabled={sending}>
        {sending ? "Отправляем…" : "Отправить Аршу"}
      </button>
    </form>
  );
}
