"use client";

import { useActionState, useMemo, useState } from "react";
import { cancelCertificate, markCertificatePaid, redeemCertificate } from "@/app/admin/actions";
import { CERT_VIEW_LABEL, certGrowth, certView, normalizeCode, type CertificateRow, type CertSummary } from "@/lib/certificates";
import { formatPhone } from "@/lib/lead";
import styles from "./admin.module.css";

type UseRow = { certificate_id: string; amount: number; note: string | null; created_at: string };

function rub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Moscow" }) : "—";
}

function Redeem({ id, balance, disabled }: { id: string; balance: number; disabled: boolean }) {
  const [state, action, pending] = useActionState(redeemCertificate, null);
  return (
    <form action={action} className={styles.inlineActions}>
      <input type="hidden" name="id" value={id} />
      <input className={styles.input} name="amount" inputMode="numeric" placeholder={`до ${rub(balance)}`} style={{ maxWidth: 140 }} />
      <input className={styles.input} name="note" placeholder="За что (необязательно)" style={{ maxWidth: 220 }} />
      <button type="submit" className={styles.primary} disabled={disabled || pending}>
        Списать
      </button>
      {state ? <span className={state.ok ? styles.itemMeta : styles.notice}>{state.message}</span> : null}
    </form>
  );
}

export function CertificatesBoard({ rows, uses, summary, disabled }: { rows: CertificateRow[]; uses: UseRow[]; summary: CertSummary; disabled: boolean }) {
  const [query, setQuery] = useState("");
  const usesById = useMemo(() => {
    const map = new Map<string, UseRow[]>();
    for (const use of uses) map.set(use.certificate_id, [...(map.get(use.certificate_id) ?? []), use]);
    return map;
  }, [uses]);

  const needle = query.trim();
  const filtered = needle
    ? rows.filter((row) => {
        const code = normalizeCode(needle);
        const digits = needle.replace(/\D/g, "");
        return row.code === code || row.code.includes(needle.toUpperCase()) || (digits.length >= 4 && row.buyer_phone.includes(digits));
      })
    : rows;

  return (
    <>
      <section className={styles.card}>
        <div className={styles.grid2}>
          <p>
            <span className={styles.itemMeta}>Продано (оплачено)</span>
            <br />
            <b>{rub(summary.sold)}</b>
          </p>
          <p>
            <span className={styles.itemMeta}>Уже оказано услуг</span>
            <br />
            <b>{rub(summary.redeemed)}</b>
          </p>
          <p>
            <span className={styles.itemMeta}>Ещё должны клиентам</span>
            <br />
            <b>{rub(summary.outstanding)}</b>
          </p>
          <p>
            <span className={styles.itemMeta}>Ждут оплаты</span>
            <br />
            <b>{rub(summary.pending)}</b>
          </p>
        </div>
        {summary.expiredBalance > 0 ? (
          <p className={styles.itemMeta}>Остаток на истёкших сертификатах: {rub(summary.expiredBalance)} — как его учитывать, уточните у бухгалтера.</p>
        ) : null}
      </section>

      <label className={styles.field}>
        <span className={styles.label}>Найти по коду или телефону</span>
        <input className={styles.input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ARSH-7K2M-Q9WD или 9001234567" />
      </label>

      {filtered.length === 0 ? <p className={styles.empty}>{rows.length === 0 ? "Сертификатов пока нет." : "Ничего не нашлось."}</p> : null}

      {filtered.map((row) => {
        const view = certView(row);
        const history = usesById.get(row.id) ?? [];
        // Копилка: нарастающий бонус шашлыком добавится к остатку при первом списании.
        const growth = view === "paid" ? certGrowth(row) : { months: 0, bonus: 0 };
        return (
          <article key={row.id} className={styles.card}>
            <p className={styles.itemMeta}>
              {day(row.created_at)} · {CERT_VIEW_LABEL[view]}
              {row.expires_at ? ` · до ${day(row.expires_at)}` : ""}
            </p>
            <p className={styles.cardTitle}>
              🎁 {row.code} · {rub(row.amount)}
              {row.balance !== row.amount ? ` · остаток ${rub(row.balance)}` : ""}
            </p>
            {row.kind === "kopilka" ? (
              <p className={styles.itemMeta}>
                🐷 Копилка{growth.bonus > 0 ? ` · наросло ${rub(growth.bonus)} шашлыком (${growth.months} мес.), добавится при первом списании` : ""}
                {row.bonus ? ` · бонус ${rub(row.bonus)} уже в остатке` : ""}
              </p>
            ) : null}
            <p className={styles.itemText}>
              {row.title}
              {row.recipient_name ? ` · для: ${row.recipient_name}` : ""}
            </p>
            <p className={styles.itemMeta}>
              Покупатель: {row.buyer_name}, <a href={`tel:${row.buyer_phone}`}>{formatPhone(row.buyer_phone)}</a>
              {row.buyer_email ? `, ${row.buyer_email}` : ""}
              {row.paid_via ? ` · оплата: ${row.paid_via === "online" ? "онлайн" : "отмечена вручную"}` : ""}
              {` · чек: ${row.receipt_via === "email" && row.buyer_email ? `на ${row.buyer_email}` : "SMS на номер"}`}
            </p>
            {history.length > 0 ? (
              <ul className={styles.requestList}>
                {history.map((use) => (
                  <li key={use.created_at}>
                    {day(use.created_at)} — списано {rub(use.amount)}
                    {use.note ? ` (${use.note})` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className={styles.inlineActions}>
              <a href={`/sertifikat/${row.code}`} target="_blank" rel="noopener" className={styles.secondary}>
                Открыть сертификат
              </a>
              {view === "pending" ? (
                <>
                  <form action={markCertificatePaid}>
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className={styles.primary} disabled={disabled}>
                      Оплачен
                    </button>
                  </form>
                  <form action={cancelCertificate}>
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className={styles.secondary} disabled={disabled}>
                      Отменить
                    </button>
                  </form>
                </>
              ) : null}
            </div>
            {view === "paid" ? <Redeem id={row.id} balance={row.balance + growth.bonus} disabled={disabled} /> : null}
          </article>
        );
      })}
    </>
  );
}
