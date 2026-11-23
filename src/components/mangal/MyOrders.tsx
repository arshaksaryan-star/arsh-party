"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClientId } from "@/lib/client-id";
import { formatRub } from "@/lib/order";
import { AccountPanel } from "./AccountPanel";
import { QuarterRace } from "./QuarterRace";
import styles from "./orders.module.css";

type Available = { id: string; title: string; price: number | null };
type OrderLine = { id: string; title: string; qty: number; price: number | null };
type Order = { number: number; created_at: string; items: OrderLine[]; total: number | null; status: string };

const CART_KEY = "arsh:cart";

const STATUS: Record<string, string> = {
  new: "Принят",
  confirmed: "Готовится",
  done: "Доставлен",
  cancelled: "Отменён",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
}

function summary(items: OrderLine[]): string {
  return items.map((item) => (item.qty > 1 ? `${item.title} × ${item.qty}` : item.title)).join(", ");
}

export function MyOrders({ available }: { available: Available[] }) {
  const [state, setState] = useState<{ kind: "loading" } | { kind: "error" } | { kind: "ok"; orders: Order[]; loggedIn: boolean }>({ kind: "loading" });
  const [skipped, setSkipped] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/my-orders?client=${encodeURIComponent(getClientId())}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { orders?: Order[]; error?: string; loggedIn?: boolean }) => {
        if (!alive) return;
        setState(data.error ? { kind: "error" } : { kind: "ok", orders: data.orders ?? [], loggedIn: Boolean(data.loggedIn) });
      })
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  /** «Повторить»: те же блюда по сегодняшним ценам; чего нет сегодня — пропускаем и говорим об этом. */
  function repeat(order: Order) {
    const today = new Map(available.map((item) => [item.id, item]));
    const cart: Record<string, number> = {};
    const missing: string[] = [];
    for (const line of order.items) {
      if (today.has(line.id)) cart[line.id] = Math.min(99, (cart[line.id] ?? 0) + line.qty);
      else missing.push(line.title);
    }
    if (Object.keys(cart).length === 0) {
      setSkipped(missing);
      return;
    }
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // без хранилища корзина не переживёт переход — покажем меню как есть
    }
    if (missing.length > 0) {
      setSkipped(missing);
      window.setTimeout(() => (window.location.href = "/mangal#checkout"), 2200);
    } else {
      window.location.href = "/mangal#checkout";
    }
  }

  return (
    <section className={`container ${styles.page}`} aria-labelledby="orders-title">
      <Link href="/mangal" className={styles.back}>
        ← Меню мангала
      </Link>
      <h1 id="orders-title" className={styles.title}>
        Личный кабинет
      </h1>

      <AccountPanel />
      <QuarterRace />

      <h2 className={styles.loginTitle}>Мои заказы</h2>
      <p className={styles.lead}>
        {state.kind === "ok" && state.loggedIn ? "Все заказы с вашего номера." : "Заказы с этого телефона или компьютера."} «Повторить» соберёт тот же
        заказ по сегодняшним ценам.
      </p>

      {skipped ? (
        <p className={styles.notice} role="status">
          {skipped.length > 0 ? `Сегодня нет: ${skipped.join(", ")}. ` : ""}
          {skipped.length > 0 && available.length > 0 ? "Остальное уже в заказе — открываем меню…" : "Загляните в меню — сегодня на огне другое."}
        </p>
      ) : null}

      {state.kind === "loading" ? <p className={styles.muted}>Загружаем…</p> : null}
      {state.kind === "error" ? <p className={styles.muted}>Не получилось загрузить заказы. Обновите страницу через минуту.</p> : null}

      {state.kind === "ok" && state.orders.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Здесь появятся ваши заказы</p>
          <p className={styles.muted}>Начните с мангала — что сегодня на огне, привезём горячим.</p>
          <Link href="/mangal#menu" className={styles.primary}>
            Открыть меню
          </Link>
        </div>
      ) : null}

      {state.kind === "ok" && state.orders.length > 0 ? (
        <ul className={styles.list}>
          {state.orders.map((order) => (
            <li key={order.number} className={styles.card}>
              <div className={styles.cardHead}>
                <b>№{order.number}</b>
                <span className={styles.muted}>{formatDate(order.created_at)}</span>
                <span className={styles.status} data-status={order.status}>
                  {STATUS[order.status] ?? order.status}
                </span>
              </div>
              <p className={styles.items}>{summary(order.items)}</p>
              <div className={styles.cardFoot}>
                <span className={styles.total}>{order.total !== null ? formatRub(order.total) : "Сумма уточнялась"}</span>
                <button type="button" className={styles.primary} onClick={() => repeat(order)}>
                  Повторить
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
