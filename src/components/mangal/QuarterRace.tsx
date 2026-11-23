"use client";

import { useEffect, useState } from "react";
import styles from "./orders.module.css";

type Race = {
  visible: boolean;
  quarter?: string;
  entries?: { place: number; name: string; you: boolean }[];
  mine?: { place: number | null; amount: number; gap: number | null } | null;
};

/** Гонка квартала в личном кабинете: первые 50 приглашаются Аршем на вечеринку. Имена скрыты до имени и 4 цифр номера. */
export function QuarterRace() {
  const [race, setRace] = useState<Race | null>(null);
  useEffect(() => {
    fetch("/api/race", { cache: "no-store" })
      .then((response) => response.json() as Promise<Race>)
      .then(setRace)
      .catch(() => setRace(null));
  }, []);
  if (!race?.visible || !race.entries) return null;
  return (
    <section className={styles.account} aria-labelledby="race-title">
      <p id="race-title" className={styles.loginTitle}>
        🏆 Гонка квартала
      </p>
      <p className={styles.muted}>{race.quarter}. Пятьдесят гостей, которые заказали у нас больше всех за квартал, Арш приглашает на вечеринку.</p>
      {race.mine ? (
        <p>
          {race.mine.place && race.mine.place <= 50
            ? `Вы на ${race.mine.place}-м месте — вы в списке приглашённых!`
            : race.mine.gap !== null
              ? `До пятидесятки не хватает ${race.mine.gap.toLocaleString("ru-RU")} ₽.`
              : "Сделайте заказ в этом квартале — и вы в гонке."}
        </p>
      ) : null}
      {race.entries.length > 0 ? (
        <ol className={styles.race}>
          {race.entries.map((entry) => (
            <li key={entry.place} data-you={entry.you ? "true" : "false"}>
              <span>{entry.place}</span>
              {entry.name}
              {entry.you ? " — это вы" : ""}
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.muted}>В этом квартале гонка только началась.</p>
      )}
    </section>
  );
}
