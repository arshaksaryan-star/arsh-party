"use client";

import { useEffect, useState } from "react";
import { useContent } from "@/components/content/ContentProvider";
import { accentVars, defaultDirections, type DirectionSlug } from "@/content/directions";
import { phoneHref } from "@/content/site";
import { getClientId } from "@/lib/client-id";
import { CFO_CITIES, CONTACT_OPTIONS, todayInMoscow, validateLead, type ContactVia, type LeadField } from "@/lib/lead";
import { directionFromHash } from "@/lib/order-link";
import { Star } from "@/components/ui/Star";
import styles from "./LeadForm.module.css";
import { PhoneInput } from "@/components/ui/PhoneInput";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; number: number | null }
  | { kind: "error"; message: string };

type Values = {
  direction: DirectionSlug;
  name: string;
  phone: string;
  contactVia: ContactVia;
  city: string;
  date: string;
  guests: string;
  comment: string;
  consent: boolean;
  website: string;
};

const INITIAL: Values = {
  direction: "sshp",
  name: "",
  phone: "",
  contactVia: "call",
  city: "Рязань",
  date: "",
  guests: "",
  comment: "",
  consent: false,
  website: "",
};

function isDirection(value: string | null): value is DirectionSlug {
  return defaultDirections.some((direction) => direction.slug === value);
}

/** initialDirection — направление, выбранное заранее (на странице звезды). */
export function LeadForm({ initialDirection }: { initialDirection?: DirectionSlug } = {}) {
  const { site, directions } = useContent();
  const [values, setValues] = useState<Values>(() => (initialDirection ? { ...INITIAL, direction: initialDirection } : INITIAL));
  const [errors, setErrors] = useState<Partial<Record<LeadField, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [minDate, setMinDate] = useState<string | undefined>(undefined);

  const activeDirection = directions.find((direction) => direction.slug === values.direction) ?? directions[1];

  // Ссылки «#order-sshp» с карточек и hero выбирают направление в форме.
  useEffect(() => {
    setMinDate(todayInMoscow());
    const applyHash = () => {
      const slug = directionFromHash(window.location.hash);
      if (isDirection(slug)) setValues((current) => ({ ...current, direction: slug }));
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    // Ошибка поля исчезает, как только человек начал его исправлять.
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const check = validateLead(values);
    if (!check.ok) {
      setErrors(check.errors);
      const firstField = Object.keys(check.errors)[0];
      document.getElementById(`lead-${firstField}`)?.focus();
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, clientId: getClientId() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        number?: number | null;
        error?: string;
        errors?: Partial<Record<LeadField, string>>;
      };
      if (response.ok && data.ok) {
        setStatus({ kind: "success", number: data.number ?? null });
        setValues((current) => ({ ...INITIAL, direction: current.direction, city: current.city }));
        return;
      }
      if (data.errors) {
        setErrors(data.errors);
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({ kind: "error", message: data.error ?? "Не получилось отправить заявку." });
    } catch {
      setStatus({ kind: "error", message: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз." });
    }
  }

  const formStyle = accentVars(activeDirection.star) as React.CSSProperties;

  if (status.kind === "success") {
    return (
      <div className={styles.success} style={formStyle} role="status">
        <Star color={activeDirection.star} className={styles.successStar} />
        <p className={styles.successTitle}>
          {status.number ? `Заявка №${status.number} у нас` : "Заявка у нас"}
        </p>
        <p className={styles.successText}>
          Скоро свяжемся, уточним детали и предложим варианты по направлению «{activeDirection.title}».
        </p>
        <button type="button" className={styles.secondary} onClick={() => setStatus({ kind: "idle" })}>
          Отправить ещё одну заявку
        </button>
        <div className={styles.neighbours}>
          <p className={styles.neighboursTitle}>Пока ждёте — загляните к соседним звёздам</p>
          <ul className={styles.neighboursList}>
            {directions
              .filter((direction) => direction.slug !== activeDirection.slug)
              .map((direction) => (
                <li key={direction.slug}>
                  <a href={`/${direction.slug}`} className={styles.neighbour}>
                    <Star color={direction.star} className={styles.neighbourStar} />
                    <span>{direction.short}</span>
                  </a>
                </li>
              ))}
          </ul>
        </div>
      </div>
    );
  }

  const fieldError = (field: LeadField) =>
    errors[field] ? (
      <span className={styles.error} id={`lead-${field}-error`}>
        {errors[field]}
      </span>
    ) : null;
  const describedBy = (field: LeadField) => (errors[field] ? `lead-${field}-error` : undefined);

  return (
    <form className={styles.form} style={formStyle} onSubmit={handleSubmit} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Что нужно</legend>
        <div className={styles.directions}>
          {directions.map((direction) => (
            <label
              key={direction.slug}
              className={styles.directionChip}
              style={{ "--c": `var(--c-${direction.star})` } as React.CSSProperties}
            >
              <input
                type="radio"
                name="direction"
                value={direction.slug}
                checked={values.direction === direction.slug}
                onChange={() => update("direction", direction.slug)}
                id={direction.slug === values.direction ? "lead-direction" : undefined}
              />
              <Star color={direction.star} className={styles.chipStar} />
              <span>{direction.short}</span>
            </label>
          ))}
        </div>
        {fieldError("direction")}
      </fieldset>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Имя</span>
          <input
            id="lead-name"
            className={styles.input}
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy("name")}
            placeholder="Как к вам обращаться"
          />
          {fieldError("name")}
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Телефон</span>
          <PhoneInput
            id="lead-phone"
            className={styles.input}
            name="phone"
            value={values.phone}
            onChange={(phone) => update("phone", phone)}
            invalid={Boolean(errors.phone)}
            describedBy={describedBy("phone")}
          />
          {fieldError("phone")}
        </label>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Как удобнее связаться</legend>
        <div className={styles.segmented}>
          {CONTACT_OPTIONS.map((option) => (
            <label key={option.value} className={styles.segment}>
              <input
                type="radio"
                name="contactVia"
                value={option.value}
                checked={values.contactVia === option.value}
                onChange={() => update("contactVia", option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.row3}>
        <label className={styles.field}>
          <span className={styles.label}>Город</span>
          <input
            id="lead-city"
            className={styles.input}
            name="city"
            list="lead-cities"
            autoComplete="address-level2"
            value={values.city}
            onChange={(event) => update("city", event.target.value)}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={describedBy("city")}
          />
          <datalist id="lead-cities">
            {CFO_CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          {fieldError("city")}
        </label>
        <label className={styles.field}>
          <span className={styles.label}>
            Дата <span className={styles.optional}>необязательно</span>
          </span>
          <input
            id="lead-date"
            className={styles.input}
            name="date"
            type="date"
            min={minDate}
            value={values.date}
            onChange={(event) => update("date", event.target.value)}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={describedBy("date")}
          />
          {fieldError("date")}
        </label>
        <label className={styles.field}>
          <span className={styles.label}>
            Гостей <span className={styles.optional}>примерно</span>
          </span>
          <input
            id="lead-guests"
            className={styles.input}
            name="guests"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            value={values.guests}
            onChange={(event) => update("guests", event.target.value)}
            aria-invalid={Boolean(errors.guests)}
            aria-describedby={describedBy("guests")}
            placeholder="40"
          />
          {fieldError("guests")}
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>
          Расскажите о празднике <span className={styles.optional}>необязательно</span>
        </span>
        <textarea
          id="lead-comment"
          className={`${styles.input} ${styles.textarea}`}
          name="comment"
          rows={3}
          value={values.comment}
          onChange={(event) => update("comment", event.target.value)}
          aria-invalid={Boolean(errors.comment)}
          aria-describedby={describedBy("comment")}
          placeholder="Повод, площадка, пожелания по меню"
        />
        {fieldError("comment")}
      </label>

      {/* Ловушка для ботов: людям поле не видно */}
      <div className={styles.trap} aria-hidden="true">
        <label>
          Сайт
          <input tabIndex={-1} autoComplete="off" name="website" value={values.website} onChange={(event) => update("website", event.target.value)} />
        </label>
      </div>

      <label className={styles.consent}>
        <input
          id="lead-consent"
          type="checkbox"
          name="consent"
          checked={values.consent}
          onChange={(event) => update("consent", event.target.checked)}
          aria-invalid={Boolean(errors.consent)}
          aria-describedby={describedBy("consent")}
        />
        <span>
          Даю{" "}
          <a href="/soglasie" target="_blank" rel="noopener">
            согласие на обработку персональных данных
          </a>{" "}
          на условиях{" "}
          <a href="/privacy" target="_blank" rel="noopener">
            Политики конфиденциальности
          </a>
          , чтобы со мной связались по заявке.
        </span>
      </label>
      {fieldError("consent")}

      {status.kind === "error" ? (
        <p className={styles.formError} role="alert">
          {status.message}
          {site.phone ? (
            <>
              {" "}
              Позвоните нам: <a href={phoneHref(site.phone)}>{site.phone}</a>
            </>
          ) : null}
        </p>
      ) : null}

      <button type="submit" className={styles.submit} disabled={status.kind === "sending"}>
        {status.kind === "sending" ? "Отправляем…" : "Отправить заявку"}
        <Star className={styles.submitStar} />
      </button>
    </form>
  );
}
