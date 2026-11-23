"use client";

import { useState } from "react";
import { Star } from "@/components/ui/Star";
import { accentVars } from "@/content/directions";
import { CERT_MAX_CUSTOM, CERT_MIN_CUSTOM, CERT_OFFERS, KOPILKA, validateCertificate, type CertErrors, type CertKind, type CertOffer } from "@/lib/certificates";
import styles from "./gift.module.css";
import { PhoneInput } from "@/components/ui/PhoneInput";

function rub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

type Done = { code: string; url: string };

/** Выбор сертификата и форма покупки: /podarok — все обычные, /zvezda — «Копилка». */
export function GiftShop({ online, offers = CERT_OFFERS, initial = "party" }: { online: boolean; offers?: readonly CertOffer[]; initial?: CertKind }) {
  const [kind, setKind] = useState<CertKind>(initial);
  const isKopilka = kind === "kopilka";
  const [custom, setCustom] = useState(isKopilka ? String(KOPILKA.min) : "5000");
  const minCustom = isKopilka ? KOPILKA.min : CERT_MIN_CUSTOM;
  const maxCustom = isKopilka ? KOPILKA.max : CERT_MAX_CUSTOM;
  const [errors, setErrors] = useState<CertErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [receiptVia, setReceiptVia] = useState<"sms" | "email">("sms");

  const offer = offers.find((item) => item.kind === kind) ?? offers[0];
  const amount = offer.amount ?? Number(custom.replace(/\s/g, "")) ?? 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      kind,
      amount: offer.amount ?? custom,
      buyerName: form.get("buyerName"),
      buyerPhone: form.get("buyerPhone"),
      buyerEmail: form.get("buyerEmail"),
      recipientName: form.get("recipientName"),
      message: form.get("message"),
      receiptVia,
      consent: form.get("consent") === "on",
      website: form.get("website"),
    };
    const check = validateCertificate(payload);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setServerError(null);
    setSending(true);
    try {
      const response = await fetch("/api/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { redirect?: string; code?: string; url?: string; error?: string; errors?: CertErrors };
      if (response.ok && data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      if (response.ok && data.code && data.url) {
        setDone({ code: data.code, url: data.url });
      } else {
        if (data.errors) setErrors(data.errors);
        setServerError(data.error ?? "Не получилось оформить. Попробуйте ещё раз или позвоните нам.");
      }
    } catch {
      setServerError("Нет связи. Проверьте интернет и попробуйте ещё раз.");
    }
    setSending(false);
  }

  if (done) {
    return (
      <div className={styles.done} role="status">
        <Star className={styles.doneStar} />
        <p className={styles.doneTitle}>Сертификат {done.code} оформлен</p>
        <p className={styles.doneText}>
          Арш свяжется с вами в ближайшее время и пришлёт ссылку на оплату. Сразу после оплаты сертификат начнёт действовать — на{" "}
          12 месяцев.
        </p>
        <a href={done.url} className={styles.primary}>
          Открыть сертификат
        </a>
      </div>
    );
  }

  return (
    <div className={styles.shop}>
      {offers.length > 1 ? (
      <ul className={styles.offers} role="radiogroup" aria-label="Выберите сертификат">
        {offers.map((item) => (
          <li key={item.kind}>
            <button
              type="button"
              role="radio"
              aria-checked={item.kind === kind}
              className={styles.offer}
              style={accentVars(item.star) as React.CSSProperties}
              onClick={() => setKind(item.kind)}
            >
              <Star className={styles.offerStar} />
              <span className={styles.offerAmount}>{item.amount ? rub(item.amount) : "Своя сумма"}</span>
              <span className={styles.offerTitle}>{item.title}</span>
              <span className={styles.offerText}>{item.subtitle}</span>
            </button>
          </li>
        ))}
      </ul>
      ) : null}

      <form className={styles.form} onSubmit={submit} noValidate style={accentVars(offer.star) as React.CSSProperties}>
        <p className={styles.formTitle}>
          {offer.title} · <b>{offer.amount ? rub(offer.amount) : "своя сумма"}</b>
        </p>

        {offer.amount === null ? (
          <label className={styles.field}>
            <span className={styles.label}>
              Сумма, ₽ (от {rub(minCustom)} до {rub(maxCustom)})
            </span>
            <input className={styles.input} inputMode="numeric" value={custom} onChange={(event) => setCustom(event.target.value.replace(/[^\d\s]/g, ""))} aria-invalid={Boolean(errors.amount)} />
            {errors.amount ? <span className={styles.error}>{errors.amount}</span> : null}
          </label>
        ) : null}

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Кому дарите</span>
            <input className={styles.input} name="recipientName" placeholder="Например, Маше и Диме" maxLength={80} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Ваше имя</span>
            <input className={styles.input} name="buyerName" autoComplete="name" aria-invalid={Boolean(errors.buyerName)} />
            {errors.buyerName ? <span className={styles.error}>{errors.buyerName}</span> : null}
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Поздравление на сертификате</span>
          <textarea className={`${styles.input} ${styles.textarea}`} name="message" maxLength={300} placeholder="Пару тёплых слов — напечатаем на сертификате" />
          {errors.message ? <span className={styles.error}>{errors.message}</span> : null}
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Телефон</span>
            <PhoneInput className={styles.input} name="buyerPhone" invalid={Boolean(errors.buyerPhone)} />
            {errors.buyerPhone ? <span className={styles.error}>{errors.buyerPhone}</span> : null}
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{receiptVia === "email" ? "E-mail для чека и сертификата" : "E-mail для сертификата (необязательно)"}</span>
            <input className={styles.input} name="buyerEmail" type="email" autoComplete="email" aria-invalid={Boolean(errors.buyerEmail)} />
            {errors.buyerEmail ? <span className={styles.error}>{errors.buyerEmail}</span> : null}
          </label>
        </div>

        <fieldset className={styles.receipt}>
          <legend className={styles.label}>Куда прислать чек</legend>
          <div className={styles.receiptOptions}>
            <label className={styles.receiptOption} data-active={receiptVia === "sms" ? "true" : "false"}>
              <input type="radio" name="receiptVia" value="sms" checked={receiptVia === "sms"} onChange={() => setReceiptVia("sms")} />
              SMS на номер
            </label>
            <label className={styles.receiptOption} data-active={receiptVia === "email" ? "true" : "false"}>
              <input type="radio" name="receiptVia" value="email" checked={receiptVia === "email"} onChange={() => setReceiptVia("email")} />
              На e-mail
            </label>
          </div>
        </fieldset>

        <label className={styles.hidden} aria-hidden="true">
          Сайт
          <input tabIndex={-1} autoComplete="off" name="website" />
        </label>

        <label className={styles.consent}>
          <input type="checkbox" name="consent" aria-invalid={Boolean(errors.consent)} />
          <span>
            Даю{" "}
            <a href="/soglasie" target="_blank" rel="noopener">
              согласие на обработку персональных данных
            </a>{" "}
            на условиях{" "}
            <a href="/privacy" target="_blank" rel="noopener">
              политики конфиденциальности
            </a>
          </span>
        </label>
        {errors.consent ? <span className={styles.error}>{errors.consent}</span> : null}

        {serverError ? <p className={styles.serverError}>{serverError}</p> : null}

        <button type="submit" className={styles.submit} disabled={sending}>
          {sending ? "Оформляем…" : online ? `Оплатить ${amount ? rub(amount) : ""}` : `Оформить сертификат ${amount ? `на ${rub(amount)}` : ""}`}
        </button>
        <p className={styles.footnote}>
          {online
            ? "Оплата картой или СБП на защищённой странице банка. Сертификат придёт сразу после оплаты."
            : "Арш свяжется с вами и пришлёт ссылку на оплату. Сертификат действует 12 месяцев с оплаты."}
          {isKopilka ? ` Пока не тратите — растёт на ${KOPILKA.percent}% шашлыком каждый полный месяц, до ${KOPILKA.maxMonths} месяцев.` : ""}
        </p>
      </form>
    </div>
  );
}
