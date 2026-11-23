"use client";

import { useMemo, useState } from "react";
import {
  calcGroups,
  calculate,
  GUESTS_RANGE,
  LAVASH_PER_GUEST,
  MEAT_RANGE,
  rebalanceShares,
  SAUCE_GUESTS_PER_PORTION,
  sharesFor,
  SHARE_MIN,
  SIDE_RANGE,
  type CalcDish,
  type Shares,
} from "@/lib/party-calc";
import styles from "./calc.module.css";

const CART_KEY = "arsh:cart";

function rub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function kg(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} кг` : `${grams} г`;
}

function guestsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "гость";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "гостя";
  return "гостей";
}

function Chips({ dishes, picked, onToggle }: { dishes: CalcDish[]; picked: string[]; onToggle: (id: string) => void }) {
  return (
    <div className={styles.chips}>
      {dishes.map((dish) => (
        <button key={dish.id} type="button" className={styles.chip} aria-pressed={picked.includes(dish.id)} onClick={() => onToggle(dish.id)}>
          {dish.title}
          <span>
            {dish.weight} · {rub(dish.price as number)}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Калькулятор праздника: гостей → мясо на гостя → гарнир → соус и лаваш → корзина мангала.
 * compact — на странице мангала свёрнут в кнопку.
 */
export function PartyCalculator({ items, compact = false, sshpHref = "/sshp" }: { items: CalcDish[]; compact?: boolean; sshpHref?: string }) {
  const groups = useMemo(() => calcGroups(items), [items]);
  const [open, setOpen] = useState(!compact);
  const [guests, setGuests] = useState<number>(GUESTS_RANGE.start);
  const [meatGrams, setMeatGrams] = useState<number>(MEAT_RANGE.start);
  const [sideGrams, setSideGrams] = useState<number>(SIDE_RANGE.start);
  const [meatIds, setMeatIds] = useState<string[]>(() => groups.meat.slice(0, 2).map((dish) => dish.id));
  const [sideIds, setSideIds] = useState<string[]>(() => groups.sides.slice(0, 1).map((dish) => dish.id));
  const [sauce, setSauce] = useState(true);
  const [sauceIds, setSauceIds] = useState<string[]>(() => groups.sauces.map((dish) => dish.id));
  const [lavash, setLavash] = useState(true);
  const [sideOn, setSideOn] = useState(true);
  const [meatShares, setMeatShares] = useState<Shares>({});
  // Выбрали другое мясо — доли снова поровну.
  const shares = sharesFor(meatIds, meatShares);

  const result = useMemo(
    () => calculate(groups, { guests, meatGrams, meatIds, meatShares: shares, sideGrams, sideIds: sideOn ? sideIds : [], sauce, sauceIds, lavash }),
    [groups, guests, meatGrams, meatIds, shares, sideGrams, sideIds, sideOn, sauce, sauceIds, lavash],
  );

  const toggle = (list: string[], set: (next: string[]) => void, id: string, keepOne = false) => {
    if (list.includes(id)) {
      if (keepOne && list.length === 1) return;
      set(list.filter((value) => value !== id));
    } else set([...list, id]);
  };

  function toCart() {
    const cart: Record<string, number> = {};
    for (const line of result.lines) cart[line.id] = Math.min(99, line.portions);
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // хранилище недоступно — корзина не перенесётся, но страница меню откроется
    }
    window.location.href = "/mangal?calc=1#checkout";
  }

  if (groups.meat.length === 0) {
    return (
      <div className={styles.calc}>
        <p className={styles.title}>Калькулятор праздника</p>
        <p className={styles.muted}>Сегодня на огне пока нечего считать. Позвоните или оставьте заявку — посчитаем вместе.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className={styles.opener} onClick={() => setOpen(true)}>
        <span className={styles.openerIcon} aria-hidden="true">
          🧮
        </span>
        <span>
          <b>Калькулятор праздника</b>
          <br />
          Сколько мяса на вашу компанию — и сразу на мангал
        </span>
        <span aria-hidden="true">→</span>
      </button>
    );
  }

  const tooMany = result.lines.some((line) => line.portions > 99);

  return (
    <section className={styles.calc} aria-labelledby="calc-title">
      <h2 id="calc-title" className={styles.title}>
        Калькулятор праздника
      </h2>

      <div className={styles.step}>
        <p className={styles.label}>
          1. Сколько гостей <b>{guests}</b>
        </p>
        <div className={styles.stepper}>
          <button type="button" onClick={() => setGuests((n) => Math.max(GUESTS_RANGE.min, n - 1))} aria-label="Меньше гостей">
            −
          </button>
          <input
            type="range"
            min={GUESTS_RANGE.min}
            max={GUESTS_RANGE.max}
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
            aria-label="Количество гостей"
          />
          <button type="button" onClick={() => setGuests((n) => Math.min(GUESTS_RANGE.max, n + 1))} aria-label="Больше гостей">
            +
          </button>
        </div>
      </div>

      <div className={styles.step}>
        <p className={styles.label}>
          2. Мяса на гостя <b>{meatGrams} г</b>
          <span className={styles.muted}> · всего {kg(result.meatTotalGrams)}</span>
        </p>
        <input
          type="range"
          className={styles.range}
          min={MEAT_RANGE.min}
          max={MEAT_RANGE.max}
          step={MEAT_RANGE.step}
          value={meatGrams}
          onChange={(event) => setMeatGrams(Number(event.target.value))}
          aria-label="Граммов мяса на гостя"
        />
        <p className={styles.hint}>250 г — лёгкий стол с закусками, 400 г — мясо главное блюдо.</p>
        <Chips
          dishes={groups.meat}
          picked={meatIds}
          onToggle={(id) => {
            toggle(meatIds, setMeatIds, id, true);
            setMeatShares({});
          }}
        />
        {meatIds.length > 1 ? (
          <div className={styles.shares}>
            <p className={styles.sharesHead}>
              Доли мяса
              {Object.keys(meatShares).length > 0 ? (
                <button type="button" className={styles.sharesReset} onClick={() => setMeatShares({})}>
                  поровну
                </button>
              ) : null}
            </p>
            {groups.meat
              .filter((dish) => meatIds.includes(dish.id))
              .map((dish) => (
                <label key={dish.id} className={styles.share}>
                  <span className={styles.shareName}>
                    {dish.title}
                    <span>
                      <b>{shares[dish.id]}%</b> · {Math.round((meatGrams * shares[dish.id]) / 100)} г на гостя
                    </span>
                  </span>
                  <input
                    type="range"
                    className={styles.range}
                    min={SHARE_MIN}
                    max={100 - SHARE_MIN * (meatIds.length - 1)}
                    step={5}
                    value={shares[dish.id]}
                    onChange={(event) => setMeatShares(rebalanceShares(meatIds, shares, dish.id, Number(event.target.value)))}
                    aria-label={`Доля: ${dish.title}, процентов`}
                  />
                </label>
              ))}
          </div>
        ) : null}
      </div>

      {groups.sides.length > 0 ? (
        <div className={styles.step}>
          <label className={styles.switch}>
            <input type="checkbox" checked={sideOn} onChange={(event) => setSideOn(event.target.checked)} />
            <span className={styles.label}>
              3. Гарнир на гостя <b>{sideGrams} г</b>
            </span>
          </label>
          {sideOn ? (
            <>
              <input
                type="range"
                className={styles.range}
                min={SIDE_RANGE.min}
                max={SIDE_RANGE.max}
                step={SIDE_RANGE.step}
                value={sideGrams}
                onChange={(event) => setSideGrams(Number(event.target.value))}
                aria-label="Граммов гарнира на гостя"
              />
              <Chips dishes={groups.sides} picked={sideIds} onToggle={(id) => toggle(sideIds, setSideIds, id, true)} />
            </>
          ) : null}
        </div>
      ) : null}

      <div className={styles.step}>
        <p className={styles.label}>4. К столу</p>
        {groups.sauces.length > 0 ? (
          <label className={styles.switch}>
            <input type="checkbox" checked={sauce} onChange={(event) => setSauce(event.target.checked)} />
            <span>Соус — один на {SAUCE_GUESTS_PER_PORTION} гостей</span>
          </label>
        ) : null}
        {sauce && groups.sauces.length > 1 ? (
          <Chips dishes={groups.sauces} picked={sauceIds} onToggle={(id) => toggle(sauceIds, setSauceIds, id, true)} />
        ) : null}
        {groups.lavash ? (
          <label className={styles.switch}>
            <input type="checkbox" checked={lavash} onChange={(event) => setLavash(event.target.checked)} />
            <span>Лаваш — {LAVASH_PER_GUEST} порция на гостя</span>
          </label>
        ) : null}
      </div>

      <div className={styles.result} aria-live="polite">
        <ul className={styles.lines}>
          {result.lines.map((line) => (
            <li key={line.id}>
              <span>
                {line.title} × {line.portions}
                {line.grams ? <span className={styles.muted}> · {kg(line.grams)}</span> : null}
              </span>
              <b>{rub(line.sum)}</b>
            </li>
          ))}
        </ul>
        <p className={styles.total}>
          Итого <b>{rub(result.total)}</b>
          <span className={styles.muted}>
            {" "}
            · ≈ {rub(result.perGuest)} на гостя · {guests} {guestsWord(guests)}
          </span>
        </p>
        <p className={styles.hint}>Без доставки. Порции округлены вверх, чтобы хватило всем.</p>
        {tooMany ? (
          <p className={styles.warn}>Такой объём через сайт не оформить — оставьте заявку, посчитаем вместе.</p>
        ) : (
          <button type="button" className={styles.submit} onClick={toCart}>
            Заказ готов — на мангал
          </button>
        )}
        {guests >= 30 ? (
          <p className={styles.hint}>
            Большая компания? Можем приготовить прямо на месте — <a href={sshpHref}>Скорая шашлычная помощь</a>.
          </p>
        ) : null}
      </div>
    </section>
  );
}
