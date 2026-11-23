"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AMB_KEY, writeLocal } from "@/components/zvezda/amb-storage";
import styles from "./orders.module.css";
import { PhoneInput } from "@/components/ui/PhoneInput";

type Cert = { code: string; title: string; amount: number; balance: number; view: string; expires_at: string | null };
type Me = { phone: string | null; certificates?: Cert[]; ambassador?: { code: string; secret: string; balance: number } | null };

const CERT_STATUS: Record<string, string> = { pending: "ждёт оплаты", paid: "действует", used: "погашен", expired: "срок истёк", refunded: "возврат" };

function rub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function prettyPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 11 ? `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}` : phone;
}

/** Вход по номеру: номер → код из SMS → кабинет. */
function LoginForm() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  async function send(consent: boolean) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/login/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, consent }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; wait?: number };
      if (response.ok && data.ok) {
        setStep("code");
        setCode("");
        setWait(60);
      } else {
        setError(data.error ?? "Не получилось отправить код.");
        if (data.wait) setWait(data.wait);
      }
    } catch {
      setError("Нет связи. Проверьте интернет.");
    }
    setBusy(false);
  }

  async function verify(value: string) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: value }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; expired?: boolean };
      if (response.ok && data.ok) {
        window.location.reload();
        return;
      }
      setError(data.error ?? "Неверный код.");
      if (data.expired) setStep("phone");
    } catch {
      setError("Нет связи. Проверьте интернет.");
    }
    setBusy(false);
  }

  if (step === "code") {
    return (
      <form
        className={styles.login}
        onSubmit={(event) => {
          event.preventDefault();
          void verify(code);
        }}
      >
        <p className={styles.loginTitle}>Введите код</p>
        <p className={styles.muted}>
          Отправили SMS на номер 
          {prettyPhone(phone)}.{" "}
          <button type="button" className={styles.linkButton} onClick={() => setStep("phone")}>
            Другой номер
          </button>
        </p>
        <input
          className={styles.codeInput}
          value={code}
          onChange={(event) => {
            const value = event.target.value.replace(/\D/g, "").slice(0, 4);
            setCode(value);
            if (value.length === 4) void verify(value);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={4}
          placeholder="• • • •"
          aria-label="Код из сообщения"
        />
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={styles.primary} disabled={busy || code.length !== 4}>
          {busy ? "Проверяем…" : "Войти"}
        </button>
        <p className={styles.muted}>
          {wait > 0 ? (
            `Новый код — через ${wait} с`
          ) : (
            <>
              <button type="button" className={styles.linkButton} onClick={() => send(true)} disabled={busy}>
                Прислать SMS ещё раз
              </button>
            </>
          )}
        </p>
      </form>
    );
  }

  return (
    <form
      className={styles.login}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (form.get("consent") !== "on") {
          setError("Нужно согласие на обработку данных");
          return;
        }
        void send(true);
      }}
    >
      <p className={styles.loginTitle}>Войдите по номеру телефона</p>
      <p className={styles.muted}>Увидите заказы со всех устройств, свои сертификаты и шашлыкоины. Пароль не нужен — пришлём код в SMS.</p>
      <PhoneInput className={styles.phoneInput} value={phone} onChange={setPhone} />
      <label className={styles.consent}>
        <input type="checkbox" name="consent" />
        <span>
          Даю{" "}
          <a href="/soglasie" target="_blank" rel="noopener">
            согласие на обработку персональных данных
          </a>
        </span>
      </label>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={styles.primary} disabled={busy || wait > 0}>
        {busy ? "Отправляем…" : wait > 0 ? `Через ${wait} с` : "Получить код"}
      </button>
    </form>
  );
}

/** Верх личного кабинета: вход или «вы вошли» + сертификаты и шашлыкоины. */
export function AccountPanel() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((response) => response.json() as Promise<Me>)
      .then((data) => {
        setMe(data);
        // Амбассадор вошёл — корзина на этом телефоне сможет списывать его шашлыкоины.
        if (data.ambassador?.secret) writeLocal(AMB_KEY, data.ambassador.secret);
      })
      .catch(() => setMe({ phone: null }));
  }, []);

  async function logout() {
    await fetch("/api/login/logout", { method: "POST" }).catch(() => undefined);
    window.location.reload();
  }

  if (!me) return null;
  if (!me.phone) return <LoginForm />;

  const certificates = me.certificates ?? [];
  return (
    <div className={styles.account}>
      <div className={styles.accountHead}>
        <span>
          Вы вошли: <b>{prettyPhone(me.phone)}</b>
        </span>
        <button type="button" className={styles.linkButton} onClick={logout}>
          Выйти
        </button>
      </div>

      {me.ambassador ? (
        <Link href={`/zvezda/kabinet/${me.ambassador.secret}`} className={styles.coins}>
          <span className={styles.coinsValue}>{me.ambassador.balance.toLocaleString("ru-RU")}</span>
          <span>
            шашлыкоинов · ваш код для друзей <b>{me.ambassador.code}</b>
            <br />
            <span className={styles.muted}>Кабинет амбассадора →</span>
          </span>
        </Link>
      ) : null}

      {certificates.length > 0 ? (
        <div>
          <p className={styles.loginTitle}>Мои сертификаты</p>
          <ul className={styles.list}>
            {certificates.map((cert) => (
              <li key={cert.code} className={styles.card}>
                <div className={styles.cardHead}>
                  <b>{cert.code}</b>
                  <span className={styles.muted}>{CERT_STATUS[cert.view] ?? cert.view}</span>
                </div>
                <p className={styles.items}>
                  {cert.title} · {rub(cert.amount)}
                  {cert.view === "paid" && cert.balance !== cert.amount ? ` · остаток ${rub(cert.balance)}` : ""}
                </p>
                <div className={styles.cardFoot}>
                  <span className={styles.muted}>
                    {cert.expires_at ? `до ${new Date(cert.expires_at).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}` : ""}
                  </span>
                  <a href={`/sertifikat/${cert.code}`} className={styles.primary}>
                    Открыть
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
