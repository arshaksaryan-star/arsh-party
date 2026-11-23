"use client";

import { useActionState, useMemo, useState } from "react";
import {
  addClientOrder,
  deleteClient,
  deleteClientOrder,
  importClientsStart,
  mergeClients,
  saveClient,
  setRaceVisible,
  verifyClientOrder,
} from "@/app/admin/actions";
import { defaultDirections } from "@/content/directions";
import { clientCode, quarterLabel, quarterOf, RACE_SIZE, TEMPERATURE, TIERS, type ClientOrder, type ClientRow, type ClientStats } from "@/lib/clients";
import { formatPhone } from "@/lib/lead";
import { DateField } from "./DateField";
import { PhoneField } from "./PhoneField";
import { FormMessage, SubmitButton } from "./FormParts";
import admin from "./admin.module.css";
import styles from "./clients.module.css";

export type BoardClient = ClientRow & { stats: ClientStats; orders: ClientOrder[] };

/** Фильтры-кнопки складываются: «Вернуть» + «Именинники» = остывшие, у кого скоро ДР. */
type Filter = "back" | "steps" | "birthdays" | "race" | "check";
type Period = "all" | "quarter";
type SortKey = "num" | "name" | "tier" | "total" | "count" | "last" | "temperature" | "quarter" | "birthday" | "next";

const FILTERS: { id: Filter; label: string; sort?: SortKey }[] = [
  { id: "back", label: "🧊 Вернуть" },
  { id: "steps", label: "📌 Дела", sort: "next" },
  { id: "birthdays", label: "🎂 Именинники", sort: "birthday" },
  { id: "race", label: "🏆 Гонка квартала", sort: "quarter" },
  { id: "check", label: "⚠️ Проверить суммы" },
];

/** Цифры клиента за выбранный период: всё время или текущий квартал. */
type Figures = { total: number; count: number; stars: string[] };

function figuresOf(client: BoardClient, period: Period, quarter: string): Figures {
  if (period === "all") return { total: client.stats.total, count: client.stats.count, stars: client.stats.stars };
  const orders = client.orders.filter((order) => quarterOf(order.date) === quarter);
  return {
    total: orders.reduce((sum, order) => sum + order.amount, 0),
    count: orders.length,
    stars: [...new Set(orders.flatMap((order) => order.stars))],
  };
}

const STARS = defaultDirections.map((direction) => ({ slug: direction.slug, short: direction.short, color: direction.star }));
const STAR_EMOJI: Record<string, string> = { orange: "🟠", red: "🔴", green: "🟢", pink: "🩷", blue: "🔵" };

function rub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function day(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

function birthdayText(client: ClientRow): string {
  if (!client.birth_day || !client.birth_month) return "—";
  return `${String(client.birth_day).padStart(2, "0")}.${String(client.birth_month).padStart(2, "0")}${client.birth_year ? `.${client.birth_year}` : ""}`;
}

function birthdayBadge(offset: number | null): string {
  if (offset === null) return "";
  if (offset === 0) return " 🎂 сегодня";
  if (offset < 0) return ` 🎂 был ${-offset} дн. назад`;
  if (offset <= 7) return ` 🎂 через ${offset} дн.`;
  return "";
}

const tierRank = (tier: string) => TIERS.findIndex((item) => item.id === tier);

function sortValue(client: BoardClient, key: SortKey, figures: Figures): number | string {
  switch (key) {
    case "num":
      return client.num;
    case "name":
      return `${client.last_name ?? ""} ${client.name}`.trim().toLowerCase();
    case "tier":
      return tierRank(client.stats.tier) * 1e12 + client.stats.total;
    case "total":
      return figures.total;
    case "count":
      return figures.count;
    case "last":
      return client.stats.last ?? "";
    case "temperature":
      return TEMPERATURE[client.stats.temperature].rank;
    case "quarter":
      return client.stats.quarter;
    case "birthday":
      // ближайший ДР — наверху при сортировке «от большего»: инвертируем дни
      return client.stats.birthday === null ? -1e6 : -client.stats.birthday;
    case "next":
      return client.next_step_at ? -Date.parse(client.next_step_at) : -1e15;
  }
}

function ClientForm({ client, onDone }: { client: BoardClient | null; onDone?: () => void }) {
  const [state, action] = useActionState(async (prev: Parameters<typeof saveClient>[0], formData: FormData) => {
    const result = await saveClient(prev, formData);
    if (result?.ok && !client) onDone?.();
    return result;
  }, null);
  return (
    <form action={action} className={admin.card}>
      <input type="hidden" name="id" value={client?.id ?? ""} />
      <p className={admin.cardTitle}>{client ? `Карточка ${clientCode(client.num)}` : "Новый клиент"}</p>
      <div className={admin.grid2}>
        <label className={admin.field}>
          <span className={admin.label}>Имя</span>
          <input className={admin.input} name="name" defaultValue={client?.name ?? ""} maxLength={80} required autoComplete="off" />
        </label>
        <label className={admin.field}>
          <span className={admin.label}>Фамилия</span>
          <input className={admin.input} name="last_name" defaultValue={client?.last_name ?? ""} maxLength={80} autoComplete="off" />
        </label>
        <div className={admin.field}>
          <span className={admin.label}>Телефон (защита от дублей)</span>
          <PhoneField name="phone" defaultValue={client?.phone} />
        </div>
        <div className={admin.field}>
          <span className={admin.label}>День рождения</span>
          <DateField name="birthday" birthday defaultValue={client && birthdayText(client) !== "—" ? birthdayText(client) : null} label="День рождения" />
        </div>
        <label className={admin.field}>
          <span className={admin.label}>Повод и дата</span>
          <input className={admin.input} name="occasion" defaultValue={client?.occasion ?? ""} placeholder="Годовщина 20.06, корпоратив в декабре" />
        </label>
        <label className={admin.field}>
          <span className={admin.label}>Компания</span>
          <input className={admin.input} name="company" defaultValue={client?.company ?? ""} />
        </label>
        <label className={admin.field}>
          <span className={admin.label}>Откуда пришёл</span>
          <input className={admin.input} name="source" defaultValue={client?.source ?? ""} placeholder="от Марии, Яндекс, VK, сайт" />
        </label>
        <label className={admin.field}>
          <span className={admin.label}>Следующий шаг</span>
          <input className={admin.input} name="next_step" defaultValue={client?.next_step ?? ""} placeholder="Поздравить, предложить кейтеринг" />
        </label>
        <div className={admin.field}>
          <span className={admin.label}>Когда</span>
          <DateField name="next_step_at" defaultValue={client?.next_step_at ?? null} label="Когда" />
        </div>
      </div>
      <label className={admin.field}>
        <span className={admin.label}>Заметки</span>
        <textarea className={`${admin.input} ${admin.textarea}`} name="note" defaultValue={client?.note ?? ""} rows={2} />
      </label>
      <div className={admin.inlineActions}>
        <label className={admin.field} style={{ minWidth: 220 }}>
          <span className={admin.label}>Уровень</span>
          <select className={admin.input} name="tier_manual" defaultValue={client?.tier_manual ?? ""}>
            <option value="">Авто — по сумме заказов</option>
            {TIERS.map((item) => (
              <option key={item.id} value={item.id}>
                ✋ {item.emoji} {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className={admin.check}>
          <input type="checkbox" name="mark_back" defaultChecked={client?.mark_back} /> 🧊 Отметить «вернуть»
        </label>
        <label className={admin.check}>
          <input type="checkbox" name="is_company" defaultChecked={client?.is_company} /> Компания
        </label>
        <label className={admin.check}>
          <input type="checkbox" name="consent_ads" defaultChecked={client?.consent_ads} /> Согласен на рекламные сообщения
        </label>
      </div>
      <div className={admin.actions}>
        <SubmitButton>{client ? "Сохранить" : "Добавить клиента"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function OrderForm({ clientId }: { clientId: string }) {
  const [state, action] = useActionState(addClientOrder, null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className={admin.card}>
      <input type="hidden" name="client_id" value={clientId} />
      <p className={admin.cardTitle}>+ Заказ (прошлый или по телефону)</p>
      <div className={admin.inlineActions}>
        <DateField name="date" defaultValue={today} required label="Дата заказа" />
        <input className={admin.input} name="amount" inputMode="numeric" placeholder="Сумма, ₽" style={{ maxWidth: 130 }} aria-label="Сумма" />
      </div>
      <div className={admin.inlineActions}>
        {STARS.map((star) => (
          <label key={star.slug} className={admin.check}>
            <input type="checkbox" name="stars" value={star.slug} /> {STAR_EMOJI[star.color]} {star.short}
          </label>
        ))}
      </div>
      <input className={admin.input} name="note" placeholder="Что заказывали (необязательно)" maxLength={500} />
      <div className={admin.actions}>
        <SubmitButton pendingText="Добавляем…">Добавить заказ</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function MergeForm({ client }: { client: BoardClient }) {
  const [state, action] = useActionState(mergeClients, null);
  return (
    <form action={action} className={admin.inlineActions}>
      <input type="hidden" name="from" value={client.id} />
      <input className={admin.input} name="into" placeholder="AP-0012" style={{ maxWidth: 120 }} aria-label="Номер основного клиента" />
      <SubmitButton pendingText="Объединяем…">Это дубль — перенести в…</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

function Detail({ client }: { client: BoardClient }) {
  return (
    <div className={styles.detailGrid}>
      <div>
        <ClientForm client={client} />
        <div className={admin.card}>
          <p className={admin.cardTitle}>Дубль?</p>
          <p className={admin.hint}>Заказы и заполненные поля перейдут к основному клиенту, эта карточка удалится.</p>
          <MergeForm client={client} />
          <form action={deleteClient} onSubmit={(event) => !window.confirm(`Удалить ${client.name} и все его внесённые заказы?`) && event.preventDefault()}>
            <input type="hidden" name="id" value={client.id} />
            <button type="submit" className={`${admin.secondary} ${admin.danger}`}>
              Удалить клиента
            </button>
          </form>
        </div>
      </div>
      <div>
        <OrderForm clientId={client.id} />
        <div className={admin.card}>
          <p className={admin.cardTitle}>Заказы · {rub(client.stats.total)}</p>
          {client.orders.length === 0 ? <p className={admin.hint}>Заказов пока нет.</p> : null}
          <ul className={styles.orders}>
            {client.orders.map((order) => (
              <li key={order.id}>
                <b>{day(order.date)}</b>
                <span>{rub(order.amount)}</span>
                <span>{order.stars.map((slug) => STAR_EMOJI[STARS.find((star) => star.slug === slug)?.color ?? ""] ?? "").join("")}</span>
                <span className={styles.muted}>{order.source === "site" ? "сайт" : order.source === "import" ? "переписка" : "вручную"}</span>
                {order.note ? <span className={styles.muted}>{order.note}</span> : null}
                {!order.verified ? (
                  <form action={verifyClientOrder} className={admin.inlineActions}>
                    <input type="hidden" name="id" value={order.id} />
                    <input className={admin.input} name="amount" defaultValue={order.amount} inputMode="numeric" style={{ maxWidth: 110 }} aria-label="Верная сумма" />
                    <button type="submit" className={admin.secondary}>
                      ✓ Верно
                    </button>
                  </form>
                ) : null}
                {order.source !== "site" ? (
                  <form action={deleteClientOrder}>
                    <input type="hidden" name="id" value={order.id} />
                    <button type="submit" className={`${admin.secondary} ${admin.danger}`} aria-label="Удалить заказ">
                      ✕
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Summary({ clients, money }: { clients: BoardClient[]; money: (client: BoardClient) => number }) {
  const total = clients.reduce((sum, client) => sum + money(client), 0);
  const sorted = [...clients].sort((a, b) => money(b) - money(a));
  const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2)));
  const topShare = total ? Math.round((top.reduce((sum, client) => sum + money(client), 0) / total) * 100) : 0;
  return (
    <div className={styles.summary}>
      <div className={styles.tile}>
        <span className={styles.tileValue}>{clients.length}</span>клиентов · {rub(total)}
      </div>
      {TIERS.map((tier) => {
        const group = clients.filter((client) => client.stats.tier === tier.id);
        return (
          <div key={tier.id} className={styles.tile}>
            <span className={styles.tileValue}>
              {tier.emoji} {group.length}
            </span>
            {tier.label} · {rub(group.reduce((sum, client) => sum + money(client), 0))}
          </div>
        );
      })}
      <div className={styles.tile}>
        <span className={styles.tileValue}>{topShare}%</span>выручки дают 20% лучших клиентов
      </div>
      <div className={styles.tile}>
        <span className={styles.tileValue}>{clients.filter((client) => client.consent_ads).length}</span>согласны на рекламные сообщения
      </div>
    </div>
  );
}

export function ClientsBoard({ clients, raceVisible, canImport }: { clients: BoardClient[]; raceVisible: boolean; canImport: boolean }) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [summary, setSummary] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "total", desc: true });
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("");
  const [star, setStar] = useState("");
  const [consent, setConsent] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [importState, importAction] = useActionState(importClientsStart, null);
  const [today] = useState(() => new Date());
  const quarter = quarterOf(today);
  const has = (filter: Filter) => filters.includes(filter);
  const figures = useMemo(() => new Map(clients.map((client) => [client.id, figuresOf(client, period, quarter)])), [clients, period, quarter]);
  const fig = (client: BoardClient) => figures.get(client.id) ?? { total: 0, count: 0, stars: [] };

  function toggleFilter(item: (typeof FILTERS)[number]) {
    setSummary(false);
    setFilters((current) => (current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id]));
    if (!has(item.id) && item.sort) setSort({ key: item.sort, desc: true });
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    let rows = clients.filter((client) => {
      if (q && !(`${client.name} ${client.last_name ?? ""}`.toLowerCase().includes(q) || clientCode(client.num).toLowerCase().includes(q) || (digits.length >= 3 && (client.phone ?? "").includes(digits)))) return false;
      if (tier && client.stats.tier !== tier) return false;
      if (star && !fig(client).stars.includes(star)) return false;
      if (consent && String(client.consent_ads) !== consent) return false;
      return true;
    });
    if (has("back")) rows = rows.filter((client) => client.mark_back || ((client.stats.temperature === "cool" || client.stats.temperature === "sleep") && client.stats.tier !== "guest"));
    if (has("steps")) rows = rows.filter((client) => client.next_step_at && Date.parse(client.next_step_at) <= today.getTime() + 30 * 86_400_000);
    if (has("birthdays")) rows = rows.filter((client) => client.stats.birthday !== null && client.stats.birthday <= 14);
    if (has("race")) rows = rows.filter((client) => client.stats.quarter > 0);
    if (has("check")) rows = rows.filter((client) => client.stats.unverified > 0);
    if (period === "quarter" && !has("birthdays") && !has("steps") && !has("back")) rows = rows.filter((client) => fig(client).count > 0);
    const { key, desc } = sort;
    return [...rows].sort((a, b) => {
      const x = sortValue(a, key, fig(a));
      const y = sortValue(b, key, fig(b));
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ru");
      return desc ? -cmp : cmp;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, query, tier, star, consent, filters, sort, today, period, figures]);
  const race = has("race");

  const head = (key: SortKey, label: string, num = false) => (
    <th className={num ? styles.num : undefined}>
      <button
        type="button"
        className={styles.sort}
        data-active={sort.key === key ? "true" : "false"}
        onClick={() => setSort((current) => (current.key === key ? { key, desc: !current.desc } : { key, desc: true }))}
      >
        {label}
        {sort.key === key ? (sort.desc ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );

  return (
    <>
      {canImport ? (
        <form action={importAction} className={admin.card}>
          <p className={admin.cardTitle}>Стартовый список из переписки</p>
          <p className={admin.hint}>
            175 клиентов с подтверждённой оплатой из WhatsApp и Telegram. Суммы найдены в сообщениях автоматически — они помечены «⚠️
            проверить». Повторное нажатие дублей не создаёт.
          </p>
          <div className={admin.actions}>
            <SubmitButton pendingText="Загружаем…">Загрузить стартовый список</SubmitButton>
            <FormMessage state={importState} />
          </div>
        </form>
      ) : null}

      <div className={styles.views} role="toolbar" aria-label="Период">
        <button type="button" className={styles.view} aria-pressed={period === "all"} onClick={() => setPeriod("all")}>
          За всё время
        </button>
        <button type="button" className={styles.view} aria-pressed={period === "quarter"} onClick={() => setPeriod("quarter")}>
          В квартале
        </button>
        <span className={styles.muted} style={{ alignSelf: "center", paddingInline: 6 }}>
          {period === "quarter" ? quarterLabel(quarter) : "суммы и заказы за всё время"}
        </span>
      </div>

      <div className={styles.views} role="toolbar" aria-label="Фильтры — можно включить несколько">
        <button
          type="button"
          className={styles.view}
          aria-pressed={filters.length === 0 && !summary}
          onClick={() => {
            setFilters([]);
            setSummary(false);
          }}
        >
          Все
        </button>
        {FILTERS.map((item) => (
          <button key={item.id} type="button" className={styles.view} aria-pressed={has(item.id)} onClick={() => toggleFilter(item)}>
            {item.label}
          </button>
        ))}
        <button type="button" className={styles.view} aria-pressed={summary} onClick={() => setSummary((value) => !value)}>
          📊 Сводка
        </button>
      </div>
      {filters.length > 1 ? <p className={styles.muted}>Показаны клиенты, которые подходят под все выбранные кнопки сразу.</p> : null}

      {summary ? (
        <Summary clients={clients} money={(client) => fig(client).total} />
      ) : (
        <>
          <div className={styles.filters}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, телефон или AP-0001" aria-label="Поиск" />
            <select value={tier} onChange={(event) => setTier(event.target.value)} aria-label="Уровень">
              <option value="">Все уровни</option>
              {TIERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.emoji} {item.label}
                </option>
              ))}
            </select>
            <select value={star} onChange={(event) => setStar(event.target.value)} aria-label="Звезда">
              <option value="">Все звёзды</option>
              {STARS.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {STAR_EMOJI[item.color]} {item.short}
                </option>
              ))}
            </select>
            <select value={consent} onChange={(event) => setConsent(event.target.value)} aria-label="Согласие">
              <option value="">Согласие: любое</option>
              <option value="true">Есть согласие</option>
              <option value="false">Нет согласия</option>
            </select>
            <span className={styles.muted}>Найдено: {list.length}</span>
            <button type="button" className={admin.primary} onClick={() => setAdding((value) => !value)}>
              {adding ? "Закрыть" : "+ Клиент"}
            </button>
          </div>

          {adding ? <ClientForm client={null} onDone={() => setAdding(false)} /> : null}

          {race ? (
            <div className={admin.card}>
              <p className={admin.itemText}>
                {quarterLabel(quarter)}: первые {RACE_SIZE} по сумме заказов за квартал подсвечены. В личном кабинете гонка{" "}
                {raceVisible ? "видна клиентам (только имя и 4 последние цифры номера)" : "скрыта"}.
              </p>
              <form action={setRaceVisible}>
                <input type="hidden" name="on" value={raceVisible ? "0" : "1"} />
                <button type="submit" className={admin.secondary}>
                  {raceVisible ? "Скрыть гонку в кабинете" : "Показать гонку в кабинете"}
                </button>
              </form>
            </div>
          ) : null}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {race ? <th className={styles.num}>Место</th> : null}
                  {head("num", "ID")}
                  {head("name", "Имя")}
                  {head("tier", "Уровень")}
                  {head("total", period === "quarter" ? "За квартал" : "Потрачено", true)}
                  {head("count", "Заказов", true)}
                  <th>Звёзды</th>
                  {head("last", "Последний")}
                  {head("temperature", "Темп.")}
                  {period === "all" ? head("quarter", "Квартал", true) : null}
                  {head("birthday", "ДР")}
                  <th>Откуда</th>
                  {head("next", "Следующий шаг")}
                  <th>Согласие</th>
                </tr>
              </thead>
              <tbody>
                {list.map((client, index) => {
                  const tierInfo = TIERS.find((item) => item.id === client.stats.tier) ?? TIERS[0];
                  const temp = TEMPERATURE[client.stats.temperature];
                  const isOpen = open === client.id;
                  return [
                    <tr
                      key={client.id}
                      className={`${styles.row} ${race && index < RACE_SIZE ? styles.raceIn : ""}`}
                      data-open={isOpen ? "true" : "false"}
                      data-even={index % 2 === 1 ? "true" : "false"}
                      onClick={() => setOpen(isOpen ? null : client.id)}
                    >
                      {race ? <td className={styles.num}>{index + 1}</td> : null}
                      <td className={styles.code}>{clientCode(client.num)}</td>
                      <td className={styles.name}>
                        {client.name}
                        {client.last_name ? ` ${client.last_name}` : ""}
                        {client.is_company ? " 🏢" : ""}
                        <br />
                        <span className={styles.muted}>{client.phone ? formatPhone(client.phone) : "без телефона"}</span>
                      </td>
                      <td>
                        <span className={styles.tier} data-tier={client.stats.tier}>
                          {tierInfo.emoji} {tierInfo.label}
                          {client.stats.tierManual ? " ✋" : ""}
                        </span>
                        {client.mark_back ? <span title="Отмечен «вернуть»"> 🧊</span> : null}
                      </td>
                      <td className={`${styles.num} ${styles.money}`}>
                        {rub(fig(client).total)}
                        {client.stats.unverified ? <span className={styles.warn}> ⚠️</span> : null}
                      </td>
                      <td className={styles.num}>{fig(client).count}</td>
                      <td>{fig(client).stars.map((slug) => STAR_EMOJI[STARS.find((item) => item.slug === slug)?.color ?? ""] ?? "").join("")}</td>
                      <td>{day(client.stats.last)}</td>
                      <td title={temp.label}>{temp.emoji}</td>
                      {period === "all" ? <td className={styles.num}>{client.stats.quarter ? rub(client.stats.quarter) : "—"}</td> : null}
                      <td>
                        {birthdayText(client)}
                        {birthdayBadge(client.stats.birthday)}
                      </td>
                      <td className={styles.muted}>{client.source ?? "—"}</td>
                      <td>
                        {client.next_step ?? "—"}
                        {client.next_step_at ? <span className={styles.muted}> · {day(client.next_step_at)}</span> : null}
                      </td>
                      <td>{client.consent_ads ? "✓" : "—"}</td>
                    </tr>,
                    isOpen ? (
                      <tr key={`${client.id}-detail`} className={styles.detail}>
                        <td colSpan={13 + (race ? 1 : 0) - (period === "quarter" ? 1 : 0)}>
                          <Detail client={client} />
                        </td>
                      </tr>
                    ) : null,
                  ];
                })}
              </tbody>
            </table>
          </div>
          {list.length === 0 ? (
            <p className={styles.empty}>{clients.length === 0 ? "Клиентов пока нет — загрузите стартовый список или нажмите «+ Клиент»." : "Никого не нашлось — сбросьте фильтры."}</p>
          ) : null}
        </>
      )}
    </>
  );
}
