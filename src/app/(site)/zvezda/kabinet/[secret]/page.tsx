import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KabinetTools } from "@/components/zvezda/KabinetTools";
import { accentVars } from "@/content/directions";
import { COIN_CAP_EVENTS, COIN_CAP_MANGAL, COIN_EARN_PERCENT, COIN_REASON_LABEL, coinBalance } from "@/lib/ambassadors";
import { isSupabaseConfigured } from "@/lib/supabase";
import { activePerks } from "@/lib/zvezda-shared";
import { ambassadorBySecret, isSecret, ledgerOf, loadZvezda } from "@/lib/zvezda";
import styles from "@/components/zvezda/zvezda.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Кабинет амбассадора", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ secret: string }> };

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Moscow" });
}

function coinsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "шашлыкоин";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "шашлыкоина";
  return "шашлыкоинов";
}

/** Кабинет амбассадора по секретной ссылке: баланс, код для друзей, история. */
export default async function KabinetPage({ params }: Props) {
  const { secret } = await params;
  if (!isSecret(secret) || !isSupabaseConfigured()) notFound();
  const row = await ambassadorBySecret(secret).catch(() => null);
  if (!row) notFound();
  const [ledger, settings] = await Promise.all([ledgerOf(row.id).catch(() => []), loadZvezda()]);
  const balance = coinBalance(ledger);
  const perks = activePerks(settings.perks);
  const now = Date.now();

  return (
    <div className={`container ${styles.page}`} style={accentVars("orange") as React.CSSProperties}>
      <section className={styles.card} aria-label="Баланс">
        <p className={styles.heroEyebrow}>Амбассадор Arsh Party · {row.name}</p>
        {row.status === "blocked" ? <p className={styles.gateError}>Участие приостановлено. Напишите Аршу.</p> : null}
        <p className={styles.balance}>{balance.toLocaleString("ru-RU")}</p>
        <p className={styles.cardMuted}>
          {coinsWord(balance)} · 1 коин = 1 ₽ скидки. До {COIN_CAP_MANGAL}% заказа с мангала — при оформлении на этом телефоне, до {COIN_CAP_EVENTS}%
          праздника — через Арша.
        </p>
        <KabinetTools secret={secret} code={row.code} />
      </section>

      <section className={styles.section} aria-labelledby="kb-how">
        <h2 id="kb-how" className={styles.sectionTitle}>
          Как копить
        </h2>
        <p className={styles.sectionLead}>
          Друг называет код <b>{row.code}</b> при заказе или открывает вашу ссылку — код подставится в заказ сам. Когда заказ выполнен, вам
          приходит {COIN_EARN_PERCENT}% от суммы блюд. За ваши собственные заказы — тоже {COIN_EARN_PERCENT}%, если заказываете с номера, на
          который оформлен кабинет.
        </p>
        {perks.length > 0 ? (
          <>
            <p className={styles.sectionLead}>
              <b>Друг сейчас получает:</b>
            </p>
            <ul className={styles.perks}>
              {perks.map((perk) => (
                <li key={perk.id}>{perk.title}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="kb-history">
        <h2 id="kb-history" className={styles.sectionTitle}>
          История
        </h2>
        {ledger.length === 0 ? <p className={styles.sectionLead}>Пока пусто. Первый заказ друга — и здесь станет веселее.</p> : null}
        <ul className={styles.ledger}>
          {ledger.map((item) => {
            const expired = item.amount > 0 && item.expires_at !== null && Date.parse(item.expires_at) < now;
            return (
              <li key={item.id}>
                <span className={styles.ledgerWhat}>
                  {COIN_REASON_LABEL[item.reason]}
                  {item.note ? ` · ${item.note}` : ""}
                  <small>
                    {day(item.created_at)}
                    {item.amount > 0 && item.expires_at ? (expired ? " · сгорели" : ` · действуют до ${day(item.expires_at)}`) : ""}
                  </small>
                </span>
                <span className={item.amount > 0 ? styles.plus : styles.minus} style={expired ? { textDecoration: "line-through", opacity: 0.5 } : undefined}>
                  {item.amount > 0 ? "+" : "−"}
                  {Math.abs(item.amount).toLocaleString("ru-RU")}
                </span>
              </li>
            );
          })}
        </ul>
        <a href="/zvezda/pravila" className={styles.rulesLink}>
          Правила программы →
        </a>
      </section>
    </div>
  );
}
