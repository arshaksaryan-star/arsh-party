"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./DateField.module.css";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type Value = { day: number; month: number; year: number | null } | null;

const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string | null | undefined): Value {
  if (!value) return null;
  let m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  m = value.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
  if (m) return { day: Number(m[1]), month: Number(m[2]), year: m[3] ? Number(m[3]) : null };
  return null;
}

function daysIn(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Дата в админке без ручного ввода: кнопка «14.03.2026» и календарь по нажатию.
 * Ошибиться в формате нельзя — в форму уходит ГГГГ-ММ-ДД (или «ДД.ММ» / «ДД.ММ.ГГГГ» для дня рождения).
 * birthday — можно убрать год («год неизвестен»), список лет — с 1930-го.
 */
export function DateField({
  name,
  defaultValue,
  birthday = false,
  required = false,
  label,
}: {
  name: string;
  defaultValue?: string | null;
  birthday?: boolean;
  required?: boolean;
  label?: string;
}) {
  const [value, setValue] = useState<Value>(() => parse(defaultValue));
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [view, setView] = useState(() => {
    const start = parse(defaultValue);
    return { year: start?.year ?? (birthday ? 1990 : now.getFullYear()), month: start?.month ?? now.getMonth() + 1 };
  });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const hidden = !value
    ? ""
    : birthday
      ? `${pad(value.day)}.${pad(value.month)}${value.year ? `.${value.year}` : ""}`
      : `${value.year ?? now.getFullYear()}-${pad(value.month)}-${pad(value.day)}`;
  const shown = value ? `${pad(value.day)}.${pad(value.month)}${value.year ? `.${value.year}` : ""}` : "";

  const first = (new Date(view.year, view.month - 1, 1).getDay() + 6) % 7;
  const total = daysIn(view.year, view.month);
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  const isToday = (d: number) => d === now.getDate() && view.month === now.getMonth() + 1 && view.year === now.getFullYear();
  const isPicked = (d: number) => value?.day === d && value.month === view.month && (value.year === null || value.year === view.year);
  const years = Array.from({ length: birthday ? now.getFullYear() - 1929 : 12 }, (_, i) => (birthday ? now.getFullYear() - i : now.getFullYear() + 2 - i));

  function shift(delta: number) {
    setView((current) => {
      const index = current.year * 12 + (current.month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  }

  return (
    <div className={styles.wrap} ref={box}>
      <input type="hidden" name={name} value={hidden} />
      <button type="button" className={styles.field} onClick={() => setOpen((v) => !v)} aria-label={label ?? "Выбрать дату"} aria-expanded={open}>
        <span className={shown ? undefined : styles.placeholder}>{shown || (birthday ? "дд.мм.гггг" : "дд.мм.гггг")}</span>
        <span aria-hidden="true">📅</span>
      </button>
      {required && !value ? <span className={styles.need}>выберите дату</span> : null}

      {open ? (
        <div className={styles.pop} role="dialog" aria-label="Календарь">
          <div className={styles.head}>
            <button type="button" className={styles.nav} onClick={() => shift(-1)} aria-label="Предыдущий месяц">
              ‹
            </button>
            <select value={view.month} onChange={(e) => setView((c) => ({ ...c, month: Number(e.target.value) }))} aria-label="Месяц">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select value={view.year} onChange={(e) => setView((c) => ({ ...c, year: Number(e.target.value) }))} aria-label="Год">
              {(years.includes(view.year) ? years : [view.year, ...years]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" className={styles.nav} onClick={() => shift(1)} aria-label="Следующий месяц">
              ›
            </button>
          </div>
          <div className={styles.grid}>
            {WEEK.map((w) => (
              <span key={w} className={styles.week}>
                {w}
              </span>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <span key={`e${i}`} />
              ) : (
                <button
                  key={d}
                  type="button"
                  className={styles.day}
                  data-today={isToday(d) ? "true" : "false"}
                  data-picked={isPicked(d) ? "true" : "false"}
                  onClick={() => {
                    setValue({ day: d, month: view.month, year: birthday && value && value.year === null ? null : view.year });
                    setOpen(false);
                  }}
                >
                  {d}
                </button>
              ),
            )}
          </div>
          <div className={styles.foot}>
            {birthday ? (
              <label className={styles.noYear}>
                <input
                  type="checkbox"
                  checked={value?.year === null}
                  onChange={(e) => value && setValue({ ...value, year: e.target.checked ? null : view.year })}
                  disabled={!value}
                />
                год неизвестен
              </label>
            ) : (
              <button
                type="button"
                className={styles.link}
                onClick={() => {
                  setValue({ day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() });
                  setOpen(false);
                }}
              >
                Сегодня
              </button>
            )}
            {!required ? (
              <button
                type="button"
                className={styles.link}
                onClick={() => {
                  setValue(null);
                  setOpen(false);
                }}
              >
                Очистить
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
