"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STAR_POINTS } from "@/components/ui/Star";
import { getClientId } from "@/lib/client-id";
import { formatPrice, MENU_CATEGORIES, type MenuItem } from "@/lib/menu";
import { computeTotals, DELIVERY_SLOTS, formatRub, validateOrder, zoneOptions, type DeliveryZone, type OrderErrors, type OrderSettings, type Payment } from "@/lib/order";
import { coinsSpendable, COIN_CAP_MANGAL, normalizeRefCode } from "@/lib/ambassadors";
import { AMB_KEY, readLocal, REF_KEY, writeLocal } from "@/components/zvezda/amb-storage";
import styles from "./mangal.module.css";
import { PhoneInput } from "@/components/ui/PhoneInput";

const CART_KEY = "arsh:cart";
const CONTACT_KEY = "arsh:contact";

type Cart = Record<string, number>;
type Done = { number: number | null; total: number | null };

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // хранилище недоступно — корзина живёт до перезагрузки
  }
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

type Props = { items: MenuItem[]; settings: OrderSettings; phone: string | null; phoneHref: string | null; menuOk: boolean };

export function MangalMenu({ items, settings, phone, phoneHref, menuOk }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>({});
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  // Корзина переживает перезагрузку; то, чего сегодня нет в меню, из неё выпадает.
  useEffect(() => {
    const saved = readJson<Cart>(CART_KEY) ?? {};
    const clean: Cart = {};
    for (const [id, qty] of Object.entries(saved)) if (byId.has(id) && qty > 0) clean[id] = Math.min(99, qty);
    setCart(clean);
    // Пришли из «Мои заказы» → «Повторить»: сразу открываем оформление.
    if (window.location.hash === "#checkout" && Object.keys(clean).length > 0) {
      setOpen(true);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, [byId]);

  function save(change: (next: Cart) => void) {
    setCart((current) => {
      const next = { ...current };
      change(next);
      writeJson(CART_KEY, next);
      return next;
    });
  }

  function update(id: string, delta: number) {
    save((next) => {
      const qty = (next[id] ?? 0) + delta;
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(99, qty);
    });
  }

  /** Число порций вписали руками: 0 — убрать блюдо, больше 99 — 99. */
  function setQty(id: string, qty: number) {
    save((next) => {
      const value = Math.min(99, Math.max(0, Math.floor(qty)));
      if (value === 0) delete next[id];
      else next[id] = value;
    });
  }

  /** Заменить блюдо другим из меню; если оно уже в заказе — порции складываются. */
  function swap(fromId: string, toId: string) {
    if (fromId === toId || !byId.has(toId)) return;
    save((next) => {
      const qty = next[fromId] ?? 0;
      delete next[fromId];
      if (qty > 0) next[toId] = Math.min(99, (next[toId] ?? 0) + qty);
    });
  }

  const lines = Object.entries(cart)
    .map(([id, qty]) => {
      const item = byId.get(id);
      return item ? { id, title: item.title, qty, price: item.price } : null;
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const preview = computeTotals(lines, null, settings);

  // Плавающие кнопки связи поднимаются над полосой корзины.
  useEffect(() => {
    const root = document.documentElement;
    if (count > 0 && !open) root.dataset.cart = "1";
    else delete root.dataset.cart;
    return () => {
      delete root.dataset.cart;
    };
  }, [count, open]);

  const categories = MENU_CATEGORIES.filter((category) => items.some((item) => item.category === category.id));

  return (
    <section id="menu" className={`container ${styles.menu}`} aria-labelledby="menu-title">
      <div className={styles.head}>
        <div>
          <h2 id="menu-title" className={styles.heading}>
            Сегодня на огне
          </h2>
          <p className={styles.sub}>
            {settings.minSum > 0 ? `Заказ от ${formatRub(settings.minSum)}. ` : ""}
            Доставка
            {settings.nearPrice !== null ? ` ${formatRub(settings.nearPrice)} до 3 км` : ""}
            {settings.farPrice !== null ? `, ${formatRub(settings.farPrice)} дальше` : ""}, за город — по договорённости.
          </p>
        </div>
        {categories.length > 1 ? (
          <nav className={styles.cats} aria-label="Разделы меню">
            {categories.map((category) => (
              <a key={category.id} href={`#menu-${category.id}`} className={styles.cat}>
                {category.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <svg viewBox="0 0 100 100" width="48" height="48" aria-hidden="true">
            <polygon points={STAR_POINTS} style={{ fill: "var(--accent)" }} />
          </svg>
          <p className={styles.emptyTitle}>{menuOk ? "Сейчас всё разобрали или огонь ещё разгорается" : "Меню на сегодня не загрузилось"}</p>
          <p className={styles.emptyText}>
            Оформите предзаказ — приготовим к нужному времени
            {phone && phoneHref ? (
              <>
                {" "}или позвоните <a href={phoneHref}>{phone}</a>
              </>
            ) : null}
            .
          </p>
          <a href="#order" className={styles.primary}>
            Предзаказ
          </a>
        </div>
      ) : (
        categories.map((category) => (
          <div key={category.id} id={`menu-${category.id}`} className={styles.group}>
            <h3 className={styles.groupTitle}>{category.label}</h3>
            <ul className={styles.grid}>
              {items
                .filter((item) => item.category === category.id)
                .map((item) => {
                  const qty = cart[item.id] ?? 0;
                  return (
                    <li key={item.id} className={styles.card}>
                      <div className={styles.photo}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} loading="lazy" />
                        ) : (
                          <svg viewBox="0 0 100 100" width="44" height="44" aria-hidden="true">
                            <polygon points={STAR_POINTS} style={{ fill: "var(--accent)" }} />
                          </svg>
                        )}
                      </div>
                      <div className={styles.info}>
                        <p className={styles.title}>{item.title}</p>
                        {item.weight ? <p className={styles.weight}>{item.weight}</p> : null}
                        {item.description ? <p className={styles.desc}>{item.description}</p> : null}
                      </div>
                      <div className={styles.buy}>
                        <span className={item.price === null ? styles.priceAsk : styles.price}>{formatPrice(item.price)}</span>
                        {qty === 0 ? (
                          <button type="button" className={styles.add} onClick={() => update(item.id, 1)}>
                            На мангал
                          </button>
                        ) : (
                          <span className={styles.stepper}>
                            <button type="button" onClick={() => update(item.id, -1)} aria-label={`Убрать одну порцию: ${item.title}`}>
                              −
                            </button>
                            <QtyInput value={qty} label={item.title} onCommit={(value) => setQty(item.id, value)} />
                            <button type="button" onClick={() => update(item.id, 1)} aria-label={`Добавить ещё порцию: ${item.title}`}>
                              +
                            </button>
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))
      )}

      <p className={styles.preorder}>
        Нужно больше или чего-то нет в меню? <a href="#order">Предзаказ</a>: фуршет, канапе, плов, уха — любой каприз.
      </p>
      <p className={styles.preorder}>
        Уже заказывали? <a href="/kabinet">Мои заказы</a> — повторите любой в одно касание.
      </p>

      {count > 0 && !open ? (
        <div className={styles.bar}>
          <button type="button" className={styles.barButton} onClick={() => setOpen(true)}>
            <span className={styles.barSum}>
              <small>
                {count} {plural(count, "порция", "порции", "порций")}
              </small>
              <span>
                {preview.hasUnpriced ? "от " : ""}
                {formatRub(preview.subtotal)}
              </span>
            </span>
            <b>Можно готовить →</b>
          </button>
        </div>
      ) : null}

      {open ? (
        <Checkout
          lines={lines}
          items={items}
          settings={settings}
          onClose={() => setOpen(false)}
          onChange={update}
          onSetQty={setQty}
          onSwap={swap}
          onDone={(result) => {
            setDone(result);
            setCart({});
            writeJson(CART_KEY, {});
            setOpen(false);
          }}
          onStale={() => router.refresh()}
        />
      ) : null}

      {done ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="done-title" onClick={() => setDone(null)}>
          <div className={styles.doneCard} onClick={(event) => event.stopPropagation()}>
            <svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true" className={styles.doneStar}>
              <polygon points={STAR_POINTS} style={{ fill: "var(--accent)" }} />
            </svg>
            <h2 id="done-title" className={styles.doneTitle}>
              {done.number ? `Заказ №${done.number} принят` : "Заказ принят"}
            </h2>
            <p className={styles.doneText}>Скоро перезвоним, подтвердим состав и время доставки.</p>
            {done.total !== null ? <p className={styles.doneTotal}>К оплате: {formatRub(done.total)}</p> : null}
            <button type="button" className={styles.primary} onClick={() => setDone(null)}>
              Хорошо
            </button>
            <a href="/kabinet" className={styles.doneLink}>
              Мои заказы
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type Line = { id: string; title: string; qty: number; price: number | null };

/** Число порций, которое можно вписать с клавиатуры. Применяется по Enter или когда поле теряет фокус. */
function QtyInput({ value, label, onCommit }: { value: number; label: string; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const number = Number(draft.replace(/\D/g, ""));
    if (draft.trim() === "" || !Number.isFinite(number)) setDraft(String(value));
    else if (number !== value) onCommit(number);
    else setDraft(String(value));
  }

  return (
    <input
      className={styles.qty}
      value={draft}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      aria-label={`Порций: ${label}`}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 2))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

type RefInfo = { code: string; friend: string; perks: { title: string; freeDelivery: boolean }[] };
type AmbInfo = { secret: string; code: string; balance: number };

/** Код друга и шашлыкоины в корзине: код подставляется из ссылки ?ot=, баланс — если на телефоне открыт кабинет. */
function useAmbassador() {
  const [refInput, setRefInput] = useState("");
  const [ref, setRef] = useState<RefInfo | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const [amb, setAmb] = useState<AmbInfo | null>(null);

  async function checkRef(raw: string) {
    const code = normalizeRefCode(raw);
    setRefError(null);
    if (!code) {
      setRef(null);
      if (raw.trim()) setRefError("Код — от 4 до 12 латинских букв или цифр");
      return;
    }
    try {
      const response = await fetch(`/api/ambassador/ref?code=${code}`);
      const data = (await response.json()) as { ok: boolean } & Partial<RefInfo>;
      if (data.ok && data.code) {
        setRef({ code: data.code, friend: data.friend ?? "", perks: data.perks ?? [] });
        writeLocal(REF_KEY, data.code);
      } else {
        setRef(null);
        setRefError("Такого кода нет — проверьте у друга");
      }
    } catch {
      setRef(null);
    }
  }

  useEffect(() => {
    const saved = readLocal(REF_KEY);
    if (saved) {
      setRefInput(saved);
      void checkRef(saved);
    }
    const secret = readLocal(AMB_KEY);
    if (secret && /^[a-f0-9]{32}$/.test(secret)) {
      fetch("/api/ambassador/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret }) })
        .then((response) => (response.ok ? (response.json() as Promise<{ code: string; balance: number }>) : null))
        .then((data) => {
          if (data) setAmb({ secret, code: data.code, balance: data.balance });
        })
        .catch(() => undefined);
    }
  }, []);

  // Свой код себе не действует.
  const friend = ref && amb && ref.code === amb.code ? null : ref;
  return { refInput, setRefInput, checkRef, ref: friend, refError, amb };
}

function Checkout({
  lines,
  items,
  settings,
  onClose,
  onChange,
  onSetQty,
  onSwap,
  onDone,
  onStale,
}: {
  lines: Line[];
  items: MenuItem[];
  settings: OrderSettings;
  onClose: () => void;
  onChange: (id: string, delta: number) => void;
  onSetQty: (id: string, qty: number) => void;
  onSwap: (fromId: string, toId: string) => void;
  onDone: (result: Done) => void;
  onStale: () => void;
}) {
  const saved = useRef(readJson<{ name?: string; phone?: string; address?: string; zone?: DeliveryZone }>(CONTACT_KEY) ?? {});
  const [zone, setZone] = useState<DeliveryZone | null>(saved.current.zone ?? null);
  const [payment, setPayment] = useState<Payment>("cash");
  const [errors, setErrors] = useState<OrderErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { refInput, setRefInput, checkRef, ref, refError, amb } = useAmbassador();
  const [useCoins, setUseCoins] = useState(false);
  const freeDelivery = Boolean(ref?.perks.some((perk) => perk.freeDelivery));
  const zones = zoneOptions(settings).map((option) =>
    freeDelivery && (option.value === "near" || option.value === "far") ? { ...option, fee: 0 } : option,
  );
  const base = computeTotals(lines, zone, settings, { freeDelivery });
  const coinsAvailable = amb ? coinsSpendable(amb.balance, base.subtotal, COIN_CAP_MANGAL) : 0;
  const totals = computeTotals(lines, zone, settings, { freeDelivery, coins: useCoins ? coinsAvailable : 0 });
  const inCart = new Set(lines.map((line) => line.id));
  const groups = MENU_CATEGORIES.map((category) => ({ ...category, items: items.filter((item) => item.category === category.id) })).filter(
    (group) => group.items.length > 0,
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (lines.length === 0) onClose();
  }, [lines.length, onClose]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (totals.missing > 0) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      clientId: getClientId(),
      name: form.get("name"),
      phone: form.get("phone"),
      zone,
      address: form.get("address") ?? "",
      deliverAt: form.get("deliverAt"),
      payment,
      comment: form.get("comment"),
      consent: form.get("consent") === "on",
      items: lines.map((line) => ({ id: line.id, qty: line.qty })),
      refCode: ref?.code ?? null,
      ambSecret: amb?.secret ?? null,
      useCoins: useCoins && coinsAvailable > 0,
    };
    const check = validateOrder(payload);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setServerError(null);
    setSending(true);
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { number?: number | null; total?: number | null; error?: string; errors?: OrderErrors; stale?: boolean };
      if (response.ok) {
        writeJson(CONTACT_KEY, { name: check.order.name, phone: check.order.phone, address: zone === "pickup" ? saved.current.address : check.order.address, zone });
        onDone({ number: data.number ?? null, total: data.total ?? null });
        return;
      }
      if (data.errors) setErrors(data.errors);
      setServerError(data.error ?? "Не получилось отправить заказ. Попробуйте ещё раз или позвоните нам.");
      if (data.stale) onStale();
    } catch {
      setServerError("Нет связи. Проверьте интернет и попробуйте ещё раз.");
    }
    setSending(false);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="checkout-title" onClick={(event) => event.stopPropagation()}>
        <div className={styles.sheetHead}>
          <h2 id="checkout-title" className={styles.sheetTitle}>
            Ваш заказ
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <ul className={styles.lines}>
          {lines.map((line) => (
            <li key={line.id} className={styles.line}>
              <label className={styles.lineName}>
                <span className={styles.srOnly}>Блюдо</span>
                <select className={styles.lineSelect} value={line.id} onChange={(event) => onSwap(line.id, event.target.value)}>
                  {groups.map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {group.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                          {item.weight ? ` · ${item.weight}` : ""}
                          {item.id !== line.id && inCart.has(item.id) ? " (уже в заказе)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <span className={styles.stepper}>
                <button type="button" onClick={() => onChange(line.id, -1)} aria-label={`Убрать порцию: ${line.title}`}>
                  −
                </button>
                <QtyInput value={line.qty} label={line.title} onCommit={(value) => onSetQty(line.id, value)} />
                <button type="button" onClick={() => onChange(line.id, 1)} aria-label={`Добавить порцию: ${line.title}`}>
                  +
                </button>
              </span>
              <span className={styles.lineSum}>{line.price === null ? "уточним" : formatRub(line.price * line.qty)}</span>
              <button type="button" className={styles.lineRemove} onClick={() => onSetQty(line.id, 0)} aria-label={`Убрать из заказа: ${line.title}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>

        <form className={styles.form} onSubmit={submit} noValidate>
          <fieldset className={styles.zones}>
            <legend className={styles.label}>Куда везти</legend>
            {zones.map((option) => (
              <label key={option.value} className={styles.zone} data-active={zone === option.value}>
                <input type="radio" name="zone" value={option.value} checked={zone === option.value} onChange={() => setZone(option.value)} />
                <span className={styles.zoneText}>
                  <b>{option.label}</b>
                  <span>{option.hint}</span>
                </span>
                <span className={styles.zoneFee}>{option.fee === null ? "по договорённости" : option.fee === 0 ? "бесплатно" : formatRub(option.fee)}</span>
              </label>
            ))}
            {errors.zone ? <span className={styles.error}>{errors.zone}</span> : null}
          </fieldset>

          {zone !== "pickup" ? (
            <label className={styles.field}>
              <span className={styles.label}>Адрес</span>
              <input name="address" defaultValue={saved.current.address ?? ""} autoComplete="street-address" placeholder="Улица, дом, подъезд, квартира" className={styles.input} aria-invalid={Boolean(errors.address)} />
              {errors.address ? <span className={styles.error}>{errors.address}</span> : null}
            </label>
          ) : null}

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Когда</span>
              <select name="deliverAt" defaultValue="asap" className={styles.input}>
                <option value="asap">Как можно скорее</option>
                {DELIVERY_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    к {slot}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className={styles.field}>
              <legend className={styles.label}>Оплата</legend>
              <div className={styles.payments}>
                {(["cash", "card"] as const).map((value) => (
                  <label key={value} className={styles.payment} data-active={payment === value}>
                    <input type="radio" name="payment" value={value} checked={payment === value} onChange={() => setPayment(value)} />
                    {value === "cash" ? "Наличными" : "Картой"}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Имя</span>
              <input name="name" defaultValue={saved.current.name ?? ""} autoComplete="given-name" className={styles.input} aria-invalid={Boolean(errors.name)} />
              {errors.name ? <span className={styles.error}>{errors.name}</span> : null}
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Телефон</span>
              <PhoneInput className={styles.input} name="phone" defaultValue={saved.current.phone} invalid={Boolean(errors.phone)} />
              {errors.phone ? <span className={styles.error}>{errors.phone}</span> : null}
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Комментарий</span>
            <textarea name="comment" maxLength={1000} placeholder="Домофон, без лука, нужна сдача с 5000" className={`${styles.input} ${styles.textarea}`} />
          </label>

          <div className={styles.field}>
            <span className={styles.label}>Код друга (если есть)</span>
            <input
              value={refInput}
              onChange={(event) => setRefInput(event.target.value.toUpperCase())}
              onBlur={() => checkRef(refInput)}
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="Например, IVAN"
              className={styles.input}
              aria-invalid={Boolean(refError)}
            />
            {refError ? <span className={styles.error}>{refError}</span> : null}
            {ref ? (
              <span className={styles.refOk}>
                ⭐ Вы от {ref.friend || "друга"}
                {ref.perks.length > 0 ? ` — вам: ${ref.perks.map((perk) => perk.title.toLowerCase()).join(", ")}` : ""}
              </span>
            ) : null}
          </div>

          {amb && coinsAvailable > 0 ? (
            <label className={styles.consent}>
              <input type="checkbox" checked={useCoins} onChange={(event) => setUseCoins(event.target.checked)} />
              <span>
                Списать {coinsAvailable.toLocaleString("ru-RU")} шашлыкоинов (у вас {amb.balance.toLocaleString("ru-RU")}, можно до {COIN_CAP_MANGAL}% блюд)
              </span>
            </label>
          ) : null}

          <label className={styles.consent}>
            <input type="checkbox" name="consent" />
            <span>
              Даю{" "}
              <a href="/soglasie" target="_blank" rel="noopener">
                согласие на обработку персональных данных
              </a>{" "}
              на условиях{" "}
              <a href="/privacy" target="_blank" rel="noopener">
                Политики конфиденциальности
              </a>
            </span>
          </label>
          {errors.consent ? <span className={styles.error}>{errors.consent}</span> : null}

          <dl className={styles.totals}>
            <dt>Блюда</dt>
            <dd>
              {formatRub(totals.subtotal)}
              {totals.hasUnpriced ? " + уточним" : ""}
            </dd>
            <dt>Доставка</dt>
            <dd>{zone === null ? "выберите, куда везти" : totals.fee === null ? "по договорённости" : totals.fee === 0 ? "бесплатно" : formatRub(totals.fee)}</dd>
            {totals.coins > 0 ? (
              <>
                <dt>Шашлыкоины</dt>
                <dd>−{formatRub(totals.coins)}</dd>
              </>
            ) : null}
            <dt className={styles.totalLabel}>Итого</dt>
            <dd className={styles.totalValue}>{totals.total !== null ? formatRub(totals.total) : "уточним по телефону"}</dd>
          </dl>

          {totals.missing > 0 ? (
            <p className={styles.notice}>
              Минимальный заказ — {formatRub(settings.minSum)}. Добавьте ещё на {formatRub(totals.missing)}.
            </p>
          ) : null}
          {serverError ? (
            <p className={styles.serverError} role="alert">
              {serverError}
            </p>
          ) : null}

          <button type="submit" className={styles.submit} disabled={sending || totals.missing > 0}>
            {sending ? "Отправляем…" : "Заказать"}
          </button>
          <p className={styles.footnote}>Оплата при получении. Перезвоним и подтвердим заказ.</p>
        </form>
      </div>
    </div>
  );
}
