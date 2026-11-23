"use client";

import { useState } from "react";
import { validateJoin } from "@/lib/ambassadors";
import { AMB_KEY, writeLocal } from "./amb-storage";
import gift from "@/components/gift/gift.module.css";
import { PhoneInput } from "@/components/ui/PhoneInput";

type Done = { code: string; secret: string; existed: boolean };

/** «Стать амбассадором»: имя, телефон и, по желанию, свой код. */
export function JoinForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      phone: form.get("phone"),
      code: form.get("code"),
      consent: form.get("consent") === "on",
      website: form.get("website"),
    };
    const check = validateJoin(payload);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setServerError(null);
    setSending(true);
    try {
      const response = await fetch("/api/ambassador/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<Done> & { error?: string; errors?: Record<string, string> };
      if (response.ok && data.code && data.secret) {
        writeLocal(AMB_KEY, data.secret);
        setDone({ code: data.code, secret: data.secret, existed: Boolean(data.existed) });
      } else {
        if (data.errors) setErrors(data.errors);
        setServerError(data.error ?? "Не получилось. Попробуйте ещё раз.");
      }
    } catch {
      setServerError("Нет связи. Проверьте интернет и попробуйте ещё раз.");
    }
    setSending(false);
  }

  if (done) {
    return (
      <div className={gift.done} role="status">
        <p className={gift.doneTitle}>{done.existed ? "Вы уже с нами" : "Добро пожаловать в амбассадоры"}</p>
        <p className={gift.doneText}>
          Ваш код для друзей — <b style={{ fontSize: 22, letterSpacing: "0.08em" }}>{done.code}</b>. Друг называет его при заказе или
          открывает вашу ссылку — и получает плюшки, а вы — шашлыкоины.
        </p>
        <a href={`/zvezda/kabinet/${done.secret}`} className={gift.primary}>
          Мой кабинет и ссылка для друзей
        </a>
        <p className={gift.doneText} style={{ fontSize: 14 }}>
          Сохраните ссылку на кабинет в закладки — это ваш ключ. Никому её не пересылайте.
        </p>
      </div>
    );
  }

  return (
    <form className={gift.form} onSubmit={submit} noValidate>
      <div className={gift.row}>
        <label className={gift.field}>
          <span className={gift.label}>Имя</span>
          <input className={gift.input} name="name" autoComplete="given-name" aria-invalid={Boolean(errors.name)} />
          {errors.name ? <span className={gift.error}>{errors.name}</span> : null}
        </label>
        <label className={gift.field}>
          <span className={gift.label}>Телефон</span>
          <PhoneInput className={gift.input} name="phone" invalid={Boolean(errors.phone)} />
          {errors.phone ? <span className={gift.error}>{errors.phone}</span> : null}
        </label>
      </div>
      <label className={gift.field}>
        <span className={gift.label}>Свой код (необязательно)</span>
        <input className={gift.input} name="code" maxLength={12} autoCapitalize="characters" placeholder="Например, IVAN или SHASHLIK" aria-invalid={Boolean(errors.code)} />
        {errors.code ? <span className={gift.error}>{errors.code}</span> : null}
        <span className={gift.footnote} style={{ textAlign: "left" }}>
          Не придумали — сделаем из имени: Иван → IVAN. Если занято, добавим цифру.
        </span>
      </label>
      <label className={gift.hidden} aria-hidden="true">
        Сайт
        <input tabIndex={-1} autoComplete="off" name="website" />
      </label>
      <label className={gift.consent}>
        <input type="checkbox" name="consent" aria-invalid={Boolean(errors.consent)} />
        <span>
          Принимаю{" "}
          <a href="/zvezda/pravila" target="_blank" rel="noopener">
            правила программы
          </a>{" "}
          и даю{" "}
          <a href="/soglasie" target="_blank" rel="noopener">
            согласие на обработку персональных данных
          </a>
        </span>
      </label>
      {errors.consent ? <span className={gift.error}>{errors.consent}</span> : null}
      {serverError ? <p className={gift.serverError}>{serverError}</p> : null}
      <button type="submit" className={gift.submit} disabled={sending}>
        {sending ? "Секунду…" : "Стать амбассадором"}
      </button>
    </form>
  );
}
