"use client";

import { useOptimistic, useState, useTransition } from "react";
import { hideAll, setAvailability } from "@/app/kitchen/actions";
import { formatPrice, MENU_CATEGORIES, type MenuItem } from "@/lib/menu";
import styles from "./kitchen.module.css";

export function KitchenBoard({ items }: { items: MenuItem[] }) {
  // Отметка видна сразу, сервер догоняет в фоне.
  const [optimistic, setOptimistic] = useOptimistic(items, (list: MenuItem[], change: { id: string; available: boolean } | "all-off") =>
    change === "all-off"
      ? list.map((item) => ({ ...item, is_available: false }))
      : list.map((item) => (item.id === change.id ? { ...item, is_available: change.available } : item)),
  );
  const [, startTransition] = useTransition();
  const [confirmAll, setConfirmAll] = useState(false);

  const onCount = optimistic.filter((item) => item.is_available).length;

  function toggle(item: MenuItem) {
    const available = !item.is_available;
    const data = new FormData();
    data.set("id", item.id);
    data.set("available", String(available));
    startTransition(async () => {
      setOptimistic({ id: item.id, available });
      await setAvailability(data);
    });
  }

  function turnAllOff() {
    const data = new FormData();
    optimistic.filter((item) => item.is_available).forEach((item) => data.append("id", item.id));
    setConfirmAll(false);
    startTransition(async () => {
      setOptimistic("all-off");
      await hideAll(data);
    });
  }

  if (optimistic.length === 0) {
    return <p className={styles.notice}>В меню пока нет блюд. Добавьте первое ниже.</p>;
  }

  return (
    <>
      <div className={styles.summary}>
        <p>
          На сайте сейчас: <b>{onCount}</b> из {optimistic.length}
        </p>
        {onCount > 0 ? (
          confirmAll ? (
            <span className={styles.confirm}>
              Скрыть всё?
              <button type="button" className={styles.danger} onClick={turnAllOff}>
                Да, скрыть
              </button>
              <button type="button" className={styles.ghost} onClick={() => setConfirmAll(false)}>
                Отмена
              </button>
            </span>
          ) : (
            <button type="button" className={styles.ghost} onClick={() => setConfirmAll(true)}>
              Скрыть всё — конец дня
            </button>
          )
        ) : null}
      </div>

      {MENU_CATEGORIES.map((category) => {
        const list = optimistic.filter((item) => item.category === category.id);
        if (list.length === 0) return null;
        return (
          <section key={category.id} className={styles.group}>
            <h2 className={styles.groupTitle}>{category.label}</h2>
            <ul className={styles.list}>
              {list.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.item} ${item.is_available ? styles.on : ""}`}
                    onClick={() => toggle(item)}
                    aria-pressed={item.is_available}
                  >
                    <span className={styles.itemText}>
                      <b>{item.title}</b>
                      <span>{[item.weight, formatPrice(item.price)].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className={styles.switch} aria-hidden="true">
                      <span className={styles.knob} />
                    </span>
                    <span className={styles.state}>{item.is_available ? "Есть" : "Нет"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
