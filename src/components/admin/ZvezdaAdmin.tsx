"use client";

import { useActionState, useMemo, useState } from "react";
import { adjustCoins, saveZvezda, setAmbassadorStatus, setPartnerStatus } from "@/app/admin/actions";
import { COIN_CAP_EVENTS, COIN_REASON_LABEL, coinBalance, coinLedgerSummary, type AmbassadorRow, type CoinRow } from "@/lib/ambassadors";
import { formatPhone } from "@/lib/lead";
import { offersToText, type ZvezdaSettings } from "@/lib/zvezda-shared";
import styles from "./admin.module.css";

export type PartnerRow = { id: string; name: string; phone: string; company: string | null; message: string; status: string; created_at: string };

const PARTNER_STATUS: Record<string, string> = { new: "Новая", in_progress: "В работе", won: "Договорились", lost: "Не подошло" };

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Moscow" });
}

function Adjust({ id, disabled }: { id: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(adjustCoins, null);
  return (
    <form action={action} className={styles.inlineActions}>
      <input type="hidden" name="id" value={id} />
      <select name="mode" className={styles.input} style={{ maxWidth: 210 }} defaultValue="spend">
        <option value="spend">Списать (праздник, до {COIN_CAP_EVENTS}%)</option>
        <option value="event">Начислить за праздник</option>
        <option value="manual">Начислить (подарок, исправление)</option>
      </select>
      <input className={styles.input} name="amount" inputMode="numeric" placeholder="коинов" style={{ maxWidth: 110 }} />
      <input className={styles.input} name="note" placeholder="За что" style={{ maxWidth: 200 }} />
      <button type="submit" className={styles.primary} disabled={disabled || pending}>
        Провести
      </button>
      {state ? <span className={state.ok ? styles.itemMeta : styles.notice}>{state.message}</span> : null}
    </form>
  );
}

function Settings({ settings, disabled }: { settings: ZvezdaSettings; disabled: boolean }) {
  const [state, action, pending] = useActionState(saveZvezda, null);
  const rows = [...settings.perks, { id: "", title: "", on: false, freeDelivery: false }, { id: "", title: "", on: false, freeDelivery: false }];
  return (
    <form action={action} className={styles.card}>
      <p className={styles.cardTitle}>Плюшки другу по коду амбассадора</p>
      <p className={styles.hint}>
        Галочка «вкл» — плюшка действует сейчас. «Доставка 0 ₽» — сайт сам обнулит доставку по Рязани. Остальное вы кладёте в заказ, сайт
        напишет об этом в уведомлении. Пустая строка — убрать плюшку.
      </p>
      {rows.map((perk, index) => (
        <div key={`${perk.id}-${index}`} className={styles.inlineActions}>
          <input type="hidden" name={`perk_${index}_id`} defaultValue={perk.id} />
          <input className={styles.input} name={`perk_${index}_title`} defaultValue={perk.title} placeholder="Новая плюшка, например «Соус в подарок»" style={{ maxWidth: 360 }} />
          <label className={styles.check}>
            <input type="checkbox" name={`perk_${index}_on`} defaultChecked={perk.on} /> вкл
          </label>
          <label className={styles.check}>
            <input type="checkbox" name={`perk_${index}_free`} defaultChecked={perk.freeDelivery} /> доставка 0 ₽
          </label>
        </div>
      ))}

      <p className={styles.cardTitle} style={{ marginTop: 16 }}>
        Тайные предложения
      </p>
      <p className={styles.hint}>
        Одна строка — одно предложение: <code>Заголовок | Текст | 2026-12-31</code>. Дата — до какого дня показывать (можно без неё).
        Решётка в начале строки — скрыть, не удаляя.
      </p>
      <textarea name="offers" className={`${styles.input} ${styles.textarea}`} rows={6} defaultValue={offersToText(settings.offers)} />
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={disabled || pending}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
        {state ? <span className={state.ok ? styles.messageOk : styles.messageError}>{state.message}</span> : null}
      </div>
    </form>
  );
}

export function ZvezdaAdmin({
  ambassadors,
  ledger,
  partners,
  settings,
  disabled,
}: {
  ambassadors: AmbassadorRow[];
  ledger: CoinRow[];
  partners: PartnerRow[];
  settings: ZvezdaSettings;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const byAmb = useMemo(() => {
    const map = new Map<string, CoinRow[]>();
    for (const row of ledger) map.set(row.ambassador_id, [...(map.get(row.ambassador_id) ?? []), row]);
    return map;
  }, [ledger]);
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const list = ambassadors.filter(
    (row) => !q || row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q) || (digits.length >= 3 && row.phone.includes(digits)),
  );
  // Учёт по каждому амбассадору отдельно (сгорание считается по его начислениям), затем общий итог.
  const totals = ambassadors.reduce(
    (sum, row) => {
      const one = coinLedgerSummary(byAmb.get(row.id) ?? []);
      return { earned: sum.earned + one.earned, spent: sum.spent + one.spent, expired: sum.expired + one.expired, balance: sum.balance + one.balance };
    },
    { earned: 0, spent: 0, expired: 0, balance: 0 },
  );
  const n = (value: number) => value.toLocaleString("ru-RU");

  return (
    <>
      <Settings settings={settings} disabled={disabled} />

      <div className={styles.toolbar}>
        <input className={styles.input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск: код, имя или телефон" style={{ maxWidth: 320 }} />
        <span className={styles.itemMeta}>Амбассадоров: {ambassadors.length}</span>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Учёт шашлыкоинов (1 коин = 1 ₽ скидки, в чек не пробиваются)</p>
        <p className={styles.itemText}>
          Начислено: <b>{n(totals.earned)}</b> · потрачено в заказах и праздниках: <b>{n(totals.spent)}</b> · сгорело: <b>{n(totals.expired)}</b> · на
          руках у клиентов: <b>{n(totals.balance)}</b>
        </p>
        <p className={styles.hint}>«На руках» — сколько скидок вы ещё можете дать. Сгорают через 12 месяцев после начисления, раньше всего тратятся те, что скоро сгорят.</p>
      </div>

      {list.length === 0 ? <p className={styles.empty}>{ambassadors.length === 0 ? "Амбассадоров пока нет." : "Никого не нашлось."}</p> : null}
      {list.map((row) => {
        const history = byAmb.get(row.id) ?? [];
        const balance = coinBalance(history);
        return (
          <article key={row.id} className={styles.card}>
            <p className={styles.itemMeta}>
              с {day(row.created_at)} · {row.status === "active" ? "участвует" : "приостановлен"}
            </p>
            <p className={styles.cardTitle}>
              ⭐ {row.code} · {row.name} · {balance.toLocaleString("ru-RU")} коинов
            </p>
            <p className={styles.itemMeta}>
              <a href={`tel:${row.phone}`}>{formatPhone(row.phone)}</a>
            </p>
            {history.length > 0 ? (
              <details>
                <summary className={styles.itemMeta}>История ({history.length})</summary>
                <ul className={styles.requestList}>
                  {history.map((item) => (
                    <li key={item.id}>
                      {day(item.created_at)} — {item.amount > 0 ? "+" : "−"}
                      {Math.abs(item.amount)} · {COIN_REASON_LABEL[item.reason]}
                      {item.note ? ` (${item.note})` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            <Adjust id={row.id} disabled={disabled} />
            <div className={styles.inlineActions}>
              <a href={`/zvezda/kabinet/${row.secret}`} target="_blank" rel="noopener noreferrer" className={styles.secondary}>
                Кабинет
              </a>
              <form action={setAmbassadorStatus}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="status" value={row.status === "active" ? "blocked" : "active"} />
                <button type="submit" className={styles.secondary} disabled={disabled}>
                  {row.status === "active" ? "Приостановить" : "Вернуть в программу"}
                </button>
              </form>
            </div>
          </article>
        );
      })}

      <div className={styles.pageHead} style={{ marginTop: 24 }}>
        <h2 className={styles.pageTitle} style={{ fontSize: 24 }}>
          Предложения о сотрудничестве
        </h2>
      </div>
      {partners.length === 0 ? <p className={styles.empty}>Пока никто не написал.</p> : null}
      {partners.map((row) => (
        <article key={row.id} className={styles.card}>
          <p className={styles.itemMeta}>
            {day(row.created_at)} · {PARTNER_STATUS[row.status] ?? row.status}
          </p>
          <p className={styles.cardTitle}>
            🤝 {row.name}
            {row.company ? ` · ${row.company}` : ""}
          </p>
          <p className={styles.itemText} style={{ whiteSpace: "pre-wrap" }}>
            {row.message}
          </p>
          <div className={styles.inlineActions}>
            <a href={`tel:${row.phone}`} className={styles.secondary}>
              {formatPhone(row.phone)}
            </a>
            {Object.entries(PARTNER_STATUS)
              .filter(([value]) => value !== row.status)
              .map(([value, label]) => (
                <form key={value} action={setPartnerStatus}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="status" value={value} />
                  <button type="submit" className={styles.secondary} disabled={disabled}>
                    {label}
                  </button>
                </form>
              ))}
          </div>
        </article>
      ))}
    </>
  );
}
