import { setRequestStatus } from "@/app/admin/actions";
import { defaultDirections } from "@/content/directions";
import { formatPhone } from "@/lib/lead";
import styles from "./admin.module.css";

type OrderItem = {
  kind: "order";
  id: string;
  number: number;
  name: string;
  phone: string;
  address: string;
  deliver_at: string;
  payment: "cash" | "card";
  comment: string | null;
  items: { title: string; qty: number; price: number | null }[];
  total: number | null;
  subtotal: number | null;
  delivery_fee: number | null;
  coins_used?: number;
  ref_code?: string | null;
  status: string;
  created_at: string;
};

type LeadItem = {
  kind: "lead";
  id: string;
  number: number;
  direction: string;
  name: string;
  phone: string;
  contact_via: string;
  details: { city?: string; date?: string; guests?: number } | null;
  comment: string | null;
  status: string;
  created_at: string;
};

export type RequestItem = OrderItem | LeadItem;

type Stage = "new" | "work" | "closed";

const STAGE: Record<string, Stage> = {
  new: "new",
  confirmed: "work",
  in_progress: "work",
  done: "closed",
  cancelled: "closed",
  won: "closed",
  lost: "closed",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Новый",
  confirmed: "Принят, готовится",
  in_progress: "В работе",
  done: "Доставлен",
  cancelled: "Отменён",
  won: "Договорились",
  lost: "Не получилось",
};

/** Кнопки следующего шага для каждого статуса. */
const NEXT: Record<"order" | "lead", Record<string, { status: string; label: string; main?: boolean }[]>> = {
  order: {
    new: [
      { status: "confirmed", label: "Принять", main: true },
      { status: "cancelled", label: "Отменить" },
    ],
    confirmed: [
      { status: "done", label: "Доставлен", main: true },
      { status: "cancelled", label: "Отменить" },
    ],
    done: [{ status: "confirmed", label: "Вернуть в работу" }],
    cancelled: [{ status: "new", label: "Вернуть в новые" }],
  },
  lead: {
    new: [
      { status: "in_progress", label: "Взять в работу", main: true },
      { status: "lost", label: "Не получилось" },
    ],
    in_progress: [
      { status: "won", label: "Договорились", main: true },
      { status: "lost", label: "Не получилось" },
    ],
    won: [{ status: "in_progress", label: "Вернуть в работу" }],
    lost: [{ status: "in_progress", label: "Вернуть в работу" }],
  },
};

const GROUPS: { stage: Stage; title: string }[] = [
  { stage: "new", title: "Новые" },
  { stage: "work", title: "В работе" },
  { stage: "closed", title: "Закрытые" },
];

const CONTACT_LABEL: Record<string, string> = { call: "звонок", whatsapp: "WhatsApp", telegram: "Telegram" };

function rub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

function directionTitle(slug: string): string {
  return defaultDirections.find((direction) => direction.slug === slug)?.title ?? slug;
}

function Contacts({ phone }: { phone: string }) {
  const digits = phone.replace(/\D/g, "");
  return (
    <div className={styles.inlineActions}>
      <a href={`tel:+${digits}`} className={styles.secondary}>
        📞 {formatPhone(phone)}
      </a>
      <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className={styles.secondary}>
        WhatsApp
      </a>
    </div>
  );
}

function StatusButtons({ item, disabled }: { item: RequestItem; disabled: boolean }) {
  const next = NEXT[item.kind][item.status] ?? [];
  if (next.length === 0) return null;
  return (
    <div className={styles.inlineActions}>
      {next.map((step) => (
        <form key={step.status} action={setRequestStatus}>
          <input type="hidden" name="kind" value={item.kind} />
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value={step.status} />
          <button type="submit" className={step.main ? styles.primary : styles.secondary} disabled={disabled}>
            {step.label}
          </button>
        </form>
      ))}
    </div>
  );
}

function OrderCard({ item }: { item: OrderItem }) {
  return (
    <>
      <p className={styles.cardTitle}>
        🔥 Заказ с мангала №{item.number}
        {item.total !== null ? ` · ${rub(item.total)}` : " · сумма уточняется"}
      </p>
      <ul className={styles.requestList}>
        {item.items.map((line, index) => (
          <li key={index}>
            {line.title} × {line.qty}
            {line.price !== null ? ` — ${rub(line.price * line.qty)}` : " — цена уточняется"}
          </li>
        ))}
      </ul>
      <p className={styles.itemMeta}>
        {item.delivery_fee !== null ? `Доставка ${rub(item.delivery_fee)} · ` : "Доставка по договорённости · "}
        {item.deliver_at === "asap" ? "как можно скорее" : `к ${item.deliver_at}`} ·{" "}
        {item.payment === "cash" ? "наличными" : "картой / переводом"}
      </p>
      {item.coins_used || item.ref_code ? (
        <p className={styles.itemMeta}>
          {item.coins_used ? `🍢 Оплачено шашлыкоинами: ${rub(item.coins_used)} (уже вычтено из суммы, в чек не входит) · ` : ""}
          {item.ref_code ? `⭐ По коду друга ${item.ref_code} — положить плюшки` : ""}
        </p>
      ) : null}
      <p className={styles.itemText}>
        <b>{item.name}</b> · {item.address}
      </p>
    </>
  );
}

function LeadCard({ item }: { item: LeadItem }) {
  const details = item.details ?? {};
  const parts = [
    details.city,
    details.date ? new Date(`${details.date}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : null,
    details.guests ? `${details.guests} гостей` : null,
  ].filter(Boolean);
  return (
    <>
      <p className={styles.cardTitle}>
        ✉️ Заявка №{item.number} · {directionTitle(item.direction)}
      </p>
      {parts.length > 0 ? <p className={styles.itemMeta}>{parts.join(" · ")}</p> : null}
      <p className={styles.itemText}>
        <b>{item.name}</b> · удобнее: {CONTACT_LABEL[item.contact_via] ?? item.contact_via}
      </p>
    </>
  );
}

export function RequestsBoard({ items, disabled }: { items: RequestItem[]; disabled: boolean }) {
  if (items.length === 0) {
    return <p className={styles.empty}>Заказов и заявок пока нет. Они появятся здесь сразу после отправки с сайта.</p>;
  }
  return (
    <>
      {GROUPS.map((group) => {
        const list = items.filter((item) => (STAGE[item.status] ?? "new") === group.stage);
        if (list.length === 0) return null;
        const shown = group.stage === "closed" ? list.slice(0, 50) : list;
        return (
          <section key={group.stage} className={styles.category}>
            <h2 className={styles.categoryTitle}>
              {group.title} · {list.length}
            </h2>
            {shown.map((item) => (
              <article key={`${item.kind}-${item.id}`} className={styles.card}>
                <p className={styles.itemMeta}>
                  {formatDate(item.created_at)} · {STATUS_LABEL[item.status] ?? item.status}
                </p>
                {item.kind === "order" ? <OrderCard item={item} /> : <LeadCard item={item} />}
                {item.comment ? <p className={styles.itemText}>💬 {item.comment}</p> : null}
                <Contacts phone={item.phone} />
                <StatusButtons item={item} disabled={disabled} />
              </article>
            ))}
          </section>
        );
      })}
    </>
  );
}
