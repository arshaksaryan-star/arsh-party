"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { defaultDirections, EDITABLE_DIRECTION_KEYS } from "@/content/directions";
import { linesToList, textToFaq, textToFormats } from "@/content/direction-pages";
import { EDITABLE_SITE_FIELDS } from "@/content/site";
import { checkPassword, endSession, isAdmin, isAdminConfigured, startSession } from "@/lib/admin-session";
import { CONTENT_TAG } from "@/lib/content";
import { SITE_REVIEWS_TAG } from "@/lib/site-reviews-data";
import { EVENTS_TAG, MAX_EVENT_PHOTOS, validateEvent, type EventRow } from "@/lib/events";
import { addMonths, CERT_VALID_MONTHS, certGrowth, type CertificateRow } from "@/lib/certificates";
import { coinBalance, coinsEarned, COIN_TTL_MONTHS, type CoinRow } from "@/lib/ambassadors";
import { ambassadorByCode, ambassadorByPhone } from "@/lib/zvezda";
import { textToOffers, parseZvezda, type FriendPerk } from "@/lib/zvezda-shared";
import { PHOTO_SLOTS } from "@/content/photos";
import { defaultReviewItems } from "@/content/reviews";
import { normalizeTitle, parsePriceTable, readCsvFile } from "@/lib/price-table";
import type { ClientRow } from "@/lib/clients";
import { normalizePhone } from "@/lib/lead";
import { MAX_PHOTO_BYTES, MENU_TAG, PHOTO_TYPES, validateMenuItem } from "@/lib/menu";
import {
  deletePublicFile,
  deleteFiles,
  deleteRow,
  insertRow,
  REVIEW_BUCKET,
  selectRows,
  isSupabaseConfigured,
  updateRow,
  uploadPublicFile,
  upsertRow,
} from "@/lib/supabase";

/** Ответ действия для формы: показывается над кнопкой «Сохранить». */
export type ActionState = { ok: boolean; message: string } | null;

const NOT_CONFIGURED: ActionState = {
  ok: false,
  message: "База не подключена: добавьте SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY (см. README).",
};

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Каждое действие заново проверяет вход: страница могла быть открыта до выхода. */
async function guard(): Promise<ActionState> {
  if (!(await isAdmin())) return { ok: false, message: "Сессия закончилась. Обновите страницу и войдите снова." };
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  return null;
}

/** Сайт показывает новые данные сразу, без ожидания кэша. */
function refreshSite(tag: string) {
  revalidateTag(tag);
  revalidatePath("/", "layout");
}

/* ───────────── Вход и выход ───────────── */

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!isAdminConfigured()) {
    return { ok: false, message: "Пароль админки не задан: добавьте ADMIN_PASSWORD в настройки сервера." };
  }
  if (!checkPassword(field(formData, "password"))) {
    // Пауза усложняет подбор пароля перебором.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { ok: false, message: "Неверный пароль" };
  }
  await startSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

/* ───────────── Контакты и тексты ───────────── */

export async function saveSite(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;

  // Поля, которых нет в форме (видео-кружок грузится отдельной кнопкой), сохраняем как были.
  let previous: Record<string, unknown> = {};
  try {
    const rows = await selectRows<{ data: Record<string, unknown> | null }>("content", "?select=data&key=eq.site", "no-store");
    previous = rows[0]?.data ?? {};
  } catch (error) {
    console.error("[admin] saveSite read", error);
    return { ok: false, message: "Не удалось прочитать настройки. Попробуйте ещё раз." };
  }

  const data: Record<string, string | null> = {};
  for (const item of EDITABLE_SITE_FIELDS) {
    if (!formData.has(item.key)) {
      const kept = previous[item.key];
      data[item.key] = typeof kept === "string" ? kept : null;
      continue;
    }
    let value = field(formData, item.key);
    if (value.length > 300) return { ok: false, message: `«${item.label}»: не длиннее 300 символов` };
    if (item.kind === "url" && value && !/^https:\/\/\S+$/.test(value)) {
      return { ok: false, message: `«${item.label}»: ссылка должна начинаться с https://` };
    }
    if (item.key === "telegramChannel") value = value.replace(/^(https?:\/\/)?t\.me\/(s\/)?/i, "").replace(/^@/, "");
    data[item.key] = value || null;
  }

  try {
    await upsertRow("content", { key: "site", data, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error("[admin] saveSite", error);
    return { ok: false, message: "Не удалось сохранить. Проверьте подключение к базе и попробуйте ещё раз." };
  }
  refreshSite(CONTENT_TAG);
  return { ok: true, message: "Сохранено. Изменения уже на сайте." };
}

/* ───────────── Направления ───────────── */

export async function saveDirections(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;

  const data: Record<string, Record<string, unknown>> = {};
  for (const direction of defaultDirections) {
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_DIRECTION_KEYS) {
      const value = field(formData, `${direction.slug}.${key}`);
      if (key === "tags") {
        patch.tags = value
          .split(/[,\n]/)
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 6);
        continue;
      }
      if (!value) return { ok: false, message: `${direction.title}: поле не может быть пустым` };
      if (value.length > 160) return { ok: false, message: `${direction.title}: не длиннее 160 символов` };
      patch[key] = value;
    }
    // Страница направления: пустое поле — остаётся текст по умолчанию.
    const pageField = (key: string) => {
      const raw = formData.get(`${direction.slug}.page.${key}`);
      return typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : "";
    };
    const lead = pageField("lead");
    if (lead.length > 600) return { ok: false, message: `${direction.title}: текст под заголовком — до 600 символов` };
    const included = linesToList(pageField("included")).map((item) => item.slice(0, 200)).slice(0, 12);
    const steps = linesToList(pageField("steps")).map((item) => item.slice(0, 200)).slice(0, 8);
    const formats = textToFormats(pageField("formats"))
      .slice(0, 8)
      .map((item) => ({ title: item.title.slice(0, 80), text: item.text.slice(0, 300), price: item.price ? item.price.slice(0, 60) : null }));
    const faq = textToFaq(pageField("faq"))
      .slice(0, 12)
      .map((item) => ({ q: item.q.slice(0, 200), a: item.a.slice(0, 800) }));
    patch.page = { lead, included, steps, formats, faq };

    data[direction.slug] = patch;
  }

  try {
    await upsertRow("content", { key: "directions", data, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error("[admin] saveDirections", error);
    return { ok: false, message: "Не удалось сохранить. Проверьте подключение к базе и попробуйте ещё раз." };
  }
  refreshSite(CONTENT_TAG);
  return { ok: true, message: "Сохранено. Изменения уже на сайте." };
}

/* ───────────── Меню ───────────── */

async function uploadPhoto(file: File, itemId: string): Promise<string> {
  const extension = PHOTO_TYPES[file.type];
  return uploadPublicFile(`menu/${itemId}-${Date.now()}.${extension}`, await file.arrayBuffer(), file.type);
}

export async function saveMenuItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;

  const raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
  const result = validateMenuItem(raw);
  if (!result.ok) return { ok: false, message: result.error };

  const photo = formData.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (hasPhoto) {
    if (!PHOTO_TYPES[photo.type]) return { ok: false, message: "Фото: подходят JPG, PNG или WebP" };
    if (photo.size > MAX_PHOTO_BYTES) return { ok: false, message: "Фото больше 5 МБ — уменьшите его и загрузите снова" };
  }

  const existingId = field(formData, "id");
  const currentImage = field(formData, "current_image") || null;
  const removePhoto = formData.get("remove_photo") === "on";

  try {
    if (existingId) {
      let imageUrl = removePhoto ? null : currentImage;
      if (hasPhoto) imageUrl = await uploadPhoto(photo, existingId);
      await updateRow("menu_items", existingId, { ...result.item, image_url: imageUrl, updated_at: new Date().toISOString() });
      // Старое фото удаляем только после успешного сохранения новых данных.
      if (currentImage && currentImage !== imageUrl) await deletePublicFile(currentImage).catch(() => undefined);
    } else {
      const id = randomUUID();
      const imageUrl = hasPhoto ? await uploadPhoto(photo, id) : null;
      await insertRow("menu_items", { id, ...result.item, image_url: imageUrl });
    }
  } catch (error) {
    console.error("[admin] saveMenuItem", error);
    return { ok: false, message: "Не удалось сохранить позицию. Проверьте подключение к базе и хранилищу." };
  }

  refreshSite(MENU_TAG);
  revalidatePath("/admin/menu");
  return { ok: true, message: existingId ? "Позиция обновлена" : "Позиция добавлена" };
}

export async function deleteMenuItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;

  const id = field(formData, "id");
  if (!id) return { ok: false, message: "Не найдена позиция для удаления" };
  try {
    await deleteRow("menu_items", id);
    const image = field(formData, "current_image");
    if (image) await deletePublicFile(image).catch(() => undefined);
  } catch (error) {
    console.error("[admin] deleteMenuItem", error);
    return { ok: false, message: "Не удалось удалить. Попробуйте ещё раз." };
  }
  refreshSite(MENU_TAG);
  revalidatePath("/admin/menu");
  return { ok: true, message: "Позиция удалена" };
}

/* ───────────── Отзывы с сайта ───────────── */

const REVIEW_STATUSES = ["published", "hidden", "new"] as const;

/** Опубликовать, скрыть или вернуть отзыв в «новые». */
export async function setSiteReviewStatus(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  const status = field(formData, "status");
  if (!id || !REVIEW_STATUSES.includes(status as (typeof REVIEW_STATUSES)[number])) return;
  try {
    await updateRow("site_reviews", id, {
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error("[admin] setSiteReviewStatus", error);
    return;
  }
  refreshSite(SITE_REVIEWS_TAG);
  revalidatePath("/admin/reviews");
}

export async function deleteSiteReview(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  try {
    // Сначала файлы из хранилища, потом сам отзыв.
    const [row] = await selectRows<{ media: { path: string }[] | null }>("site_reviews", `?select=media&id=eq.${id}`, "no-store");
    const paths = (row?.media ?? []).map((item) => item.path);
    await deleteFiles(REVIEW_BUCKET, paths).catch((error) => console.error("[admin] delete review files", error));
    await deleteRow("site_reviews", id);
  } catch (error) {
    console.error("[admin] deleteSiteReview", error);
    return;
  }
  refreshSite(SITE_REVIEWS_TAG);
  revalidatePath("/admin/reviews");
}

/* ───────────── Праздники ───────────── */

const UUID = /^[0-9a-f-]{36}$/;

function refreshEvents(id?: string) {
  refreshSite(EVENTS_TAG);
  revalidatePath("/prazdniki");
  revalidatePath("/admin/events");
  if (id) revalidatePath(`/admin/events/${id}`);
}

async function loadEventMedia(id: string): Promise<Pick<EventRow, "photos" | "cover_url"> | null> {
  const [row] = await selectRows<Pick<EventRow, "photos" | "cover_url">>("events", `?select=photos,cover_url&id=eq.${id}`, "no-store");
  return row ?? null;
}

/** Создать или сохранить праздник. Новый после сохранения открывается для загрузки фото. */
export async function saveEvent(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;

  const result = validateEvent(Object.fromEntries(formData.entries()) as Record<string, unknown>);
  if (!result.ok) return { ok: false, message: result.error };

  const existingId = field(formData, "id");
  if (existingId && !UUID.test(existingId)) return { ok: false, message: "Не найден праздник" };
  const id = existingId || randomUUID();
  try {
    if (existingId) {
      await updateRow("events", id, { ...result.event, updated_at: new Date().toISOString() });
    } else {
      await insertRow("events", { id, ...result.event });
    }
  } catch (error) {
    console.error("[admin] saveEvent", error);
    return { ok: false, message: "Не удалось сохранить. Проверьте, что в Supabase выполнен supabase/2026-11-11-events.sql." };
  }
  refreshEvents(id);
  if (!existingId) redirect(`/admin/events/${id}`);
  return { ok: true, message: result.event.is_published ? "Сохранено. Праздник на сайте." : "Сохранено. Праздник пока скрыт с сайта." };
}

/** Одно фото за раз: браузер заранее уменьшает снимок, поэтому запрос лёгкий. */
export async function uploadEventPhoto(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = field(formData, "id");
  const photo = formData.get("photo");
  if (!UUID.test(id) || !(photo instanceof File) || photo.size === 0) return { ok: false, message: "Нет файла" };
  if (!PHOTO_TYPES[photo.type]) return { ok: false, message: "Подходят JPG, PNG или WebP" };
  if (photo.size > MAX_PHOTO_BYTES) return { ok: false, message: "Фото больше 5 МБ" };

  try {
    const row = await loadEventMedia(id);
    if (!row) return { ok: false, message: "Праздник не найден" };
    const photos = row.photos ?? [];
    if (photos.length >= MAX_EVENT_PHOTOS) return { ok: false, message: `Не больше ${MAX_EVENT_PHOTOS} фото на праздник` };
    const url = await uploadPublicFile(`events/${id}/${randomUUID()}.${PHOTO_TYPES[photo.type]}`, await photo.arrayBuffer(), photo.type);
    await updateRow("events", id, {
      photos: [...photos, url],
      cover_url: row.cover_url ?? url,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin] uploadEventPhoto", error);
    return { ok: false, message: "Не удалось загрузить фото. Проверьте интернет и попробуйте ещё раз." };
  }
  refreshEvents(id);
  return { ok: true, message: "Фото добавлено" };
}

export async function setEventCover(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  const url = field(formData, "url");
  if (!UUID.test(id) || !url) return;
  try {
    const row = await loadEventMedia(id);
    if (!row || !(row.photos ?? []).includes(url)) return;
    await updateRow("events", id, { cover_url: url, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error("[admin] setEventCover", error);
    return;
  }
  refreshEvents(id);
}

export async function removeEventPhoto(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  const url = field(formData, "url");
  if (!UUID.test(id) || !url) return;
  try {
    const row = await loadEventMedia(id);
    if (!row) return;
    const photos = (row.photos ?? []).filter((item) => item !== url);
    await updateRow("events", id, {
      photos,
      cover_url: row.cover_url === url ? (photos[0] ?? null) : row.cover_url,
      updated_at: new Date().toISOString(),
    });
    await deletePublicFile(url).catch((error) => console.error("[admin] delete event photo file", error));
  } catch (error) {
    console.error("[admin] removeEventPhoto", error);
    return;
  }
  refreshEvents(id);
}

export async function deleteEvent(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  if (!UUID.test(id)) return;
  try {
    const row = await loadEventMedia(id);
    await deleteRow("events", id);
    for (const url of row?.photos ?? []) await deletePublicFile(url).catch(() => undefined);
  } catch (error) {
    console.error("[admin] deleteEvent", error);
    return;
  }
  refreshEvents();
  redirect("/admin/events");
}

/* ───────────── Заказы и заявки ───────────── */

const ORDER_STATUSES = ["new", "confirmed", "done", "cancelled"] as const;
const LEAD_STATUSES = ["new", "in_progress", "won", "lost"] as const;

export async function setRequestStatus(formData: FormData): Promise<void> {
  if (await guard()) return;
  const kind = field(formData, "kind");
  const id = field(formData, "id");
  const status = field(formData, "status");
  const allowed: readonly string[] = kind === "order" ? ORDER_STATUSES : kind === "lead" ? LEAD_STATUSES : [];
  if (!id || !allowed.includes(status)) return;
  try {
    await updateRow(kind === "order" ? "orders" : "leads", id, { status });
  } catch (error) {
    console.error("[admin] setRequestStatus", error);
    return;
  }
  if (kind === "order") await settleCoins(id, status).catch((error) => console.error("[admin] settleCoins", error));
  revalidatePath("/admin/orders");
}

type CoinOrder = { id: string; number: number; phone: string; subtotal: number; coins_used: number; ref_code: string | null; coins_awarded: boolean };

/**
 * Шашлыкоины по заказу:
 *  «Выполнен» — 5% от оплаченного за блюда (без доставки и без потраченных коинов) заказчику-амбассадору
 *  и 5% — другу, чей код указан. Один раз на заказ.
 *  «Отменён» — потраченные на заказ коины возвращаются.
 */
async function settleCoins(orderId: string, status: string): Promise<void> {
  const [order] = await selectRows<CoinOrder>(
    "orders",
    `?select=id,number,phone,subtotal,coins_used,ref_code,coins_awarded&id=eq.${orderId}`,
    "no-store",
  );
  if (!order) return;
  if (status === "done" && !order.coins_awarded) {
    const paid = Math.max(0, order.subtotal - order.coins_used);
    const coins = coinsEarned(paid);
    const expires = addMonths(new Date(), COIN_TTL_MONTHS).toISOString();
    const own = await ambassadorByPhone(order.phone);
    if (coins > 0 && own && own.status === "active") {
      await insertRow("coin_ledger", { ambassador_id: own.id, amount: coins, reason: "own_order", order_id: order.id, note: `Заказ №${order.number}`, expires_at: expires });
    }
    const friend = order.ref_code ? await ambassadorByCode(order.ref_code) : null;
    if (coins > 0 && friend && friend.status === "active" && friend.id !== own?.id) {
      await insertRow("coin_ledger", { ambassador_id: friend.id, amount: coins, reason: "friend_order", order_id: order.id, note: `Заказ №${order.number}`, expires_at: expires });
    }
    await updateRow("orders", order.id, { coins_awarded: true });
  }
  if (status === "cancelled" && order.coins_used > 0) {
    const [spend] = await selectRows<{ ambassador_id: string }>("coin_ledger", `?select=ambassador_id&order_id=eq.${order.id}&reason=eq.spend&limit=1`, "no-store");
    if (spend) {
      await insertRow("coin_ledger", {
        ambassador_id: spend.ambassador_id,
        amount: order.coins_used,
        reason: "manual",
        order_id: order.id,
        note: `Возврат: заказ №${order.number} отменён`,
        expires_at: addMonths(new Date(), COIN_TTL_MONTHS).toISOString(),
      });
    }
    await updateRow("orders", order.id, { coins_used: 0 });
  }
}

/* ───────────── Подарочные сертификаты ───────────── */

export async function markCertificatePaid(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  if (!id) return;
  try {
    const [row] = await selectRows<{ status: string }>("certificates", `?select=status&id=eq.${id}`, "no-store");
    if (row?.status !== "pending") return;
    const now = new Date();
    await updateRow("certificates", id, {
      status: "paid",
      paid_via: "manual",
      paid_at: now.toISOString(),
      expires_at: addMonths(now, CERT_VALID_MONTHS).toISOString(),
    });
  } catch (error) {
    console.error("[admin] markCertificatePaid", error);
  }
  revalidatePath("/admin/certificates");
}

export async function cancelCertificate(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  if (!id) return;
  try {
    const [row] = await selectRows<{ status: string }>("certificates", `?select=status&id=eq.${id}`, "no-store");
    // Отменить можно только неоплаченный: оплаченный — через возврат по правилам кассы.
    if (row?.status === "pending") await updateRow("certificates", id, { status: "cancelled" });
  } catch (error) {
    console.error("[admin] cancelCertificate", error);
  }
  revalidatePath("/admin/certificates");
}

export async function redeemCertificate(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = field(formData, "id");
  const amount = Math.round(Number(field(formData, "amount").replace(/\s/g, "")));
  const note = field(formData, "note").slice(0, 200) || null;
  if (!id || !Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Укажите сумму списания" };
  try {
    const [row] = await selectRows<CertificateRow>("certificates", `?select=*&id=eq.${id}`, "no-store");
    if (!row || row.status !== "paid") return { ok: false, message: "Списать можно только с действующего сертификата" };
    if (row.expires_at && Date.parse(row.expires_at) < Date.now()) return { ok: false, message: "Срок сертификата истёк" };
    // Копилка: при первом списании фиксируем наросший бонус шашлыком и останавливаем рост.
    let available = row.balance;
    let freeze: Record<string, unknown> = {};
    if (row.growth_percent && !row.growth_stopped_at) {
      const growth = certGrowth(row);
      available += growth.bonus;
      freeze = { bonus: growth.bonus, growth_stopped_at: new Date().toISOString() };
    }
    if (amount > available) return { ok: false, message: `На сертификате осталось ${available.toLocaleString("ru-RU")} ₽` };
    await insertRow("certificate_uses", { certificate_id: id, amount, note });
    const balance = available - amount;
    await updateRow("certificates", id, { ...freeze, balance, status: balance === 0 ? "used" : "paid" });
  } catch (error) {
    console.error("[admin] redeemCertificate", error);
    return { ok: false, message: "Не получилось списать. Попробуйте ещё раз." };
  }
  revalidatePath("/admin/certificates");
  return { ok: true, message: `Списано ${amount.toLocaleString("ru-RU")} ₽` };
}

/* ───────────── Тайная звезда: амбассадоры, шашлыкоины, настройки ───────────── */

/** Ручное начисление или списание коинов (праздник — до 50% суммы, подарок, исправление). */
export async function adjustCoins(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = field(formData, "id");
  const mode = field(formData, "mode");
  const amount = Math.round(Number(field(formData, "amount").replace(/\s/g, "")));
  const note = field(formData, "note").slice(0, 200) || null;
  if (!id || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return { ok: false, message: "Укажите количество коинов" };
  try {
    if (mode === "spend") {
      const rows = await selectRows<CoinRow>("coin_ledger", `?select=amount,expires_at,created_at&ambassador_id=eq.${id}`, "no-store");
      const balance = coinBalance(rows);
      if (amount > balance) return { ok: false, message: `На балансе ${balance.toLocaleString("ru-RU")} коинов` };
      await insertRow("coin_ledger", { ambassador_id: id, amount: -amount, reason: "spend", note });
    } else {
      const reason = mode === "event" ? "event" : "manual";
      await insertRow("coin_ledger", { ambassador_id: id, amount, reason, note, expires_at: addMonths(new Date(), COIN_TTL_MONTHS).toISOString() });
    }
  } catch (error) {
    console.error("[admin] adjustCoins", error);
    return { ok: false, message: "Не получилось. Попробуйте ещё раз." };
  }
  revalidatePath("/admin/zvezda");
  return { ok: true, message: mode === "spend" ? `Списано ${amount} коинов` : `Начислено ${amount} коинов` };
}

export async function setAmbassadorStatus(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  const status = field(formData, "status");
  if (!id || (status !== "active" && status !== "blocked")) return;
  try {
    await updateRow("ambassadors", id, { status });
  } catch (error) {
    console.error("[admin] setAmbassadorStatus", error);
  }
  revalidatePath("/admin/zvezda");
}

export async function setPartnerStatus(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  const status = field(formData, "status");
  if (!id || !LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) return;
  try {
    await updateRow("partner_requests", id, { status });
  } catch (error) {
    console.error("[admin] setPartnerStatus", error);
  }
  revalidatePath("/admin/zvezda");
}

/** Тайные предложения и плюшки другу. Плюшки: строки «название», галочка включает. */
export async function saveZvezda(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const offers = textToOffers(String(formData.get("offers") ?? ""));
  const perks: FriendPerk[] = [];
  for (let i = 0; i < 20; i++) {
    const title = field(formData, `perk_${i}_title`).slice(0, 100);
    if (!title) continue;
    perks.push({
      id: field(formData, `perk_${i}_id`) || `p${i}`,
      title,
      on: formData.get(`perk_${i}_on`) === "on",
      freeDelivery: formData.get(`perk_${i}_free`) === "on",
    });
  }
  try {
    const current = parseZvezda(await readContentData("zvezda"));
    await upsertRow("content", { key: "zvezda", data: parseZvezda({ offers, perks, raceVisible: current.raceVisible }), updated_at: new Date().toISOString() });
  } catch (error) {
    console.error("[admin] saveZvezda", error);
    return { ok: false, message: "Не удалось сохранить. Попробуйте ещё раз." };
  }
  refreshSite(CONTENT_TAG);
  revalidatePath("/admin/zvezda");
  return { ok: true, message: "Сохранено — уже на тайной странице" };
}

/* ───────────── Фото Арша и отзывы с площадок (строки content "photos" и "reviews") ───────────── */

async function readContentData(key: string): Promise<Record<string, unknown>> {
  const [row] = await selectRows<{ data: unknown }>("content", `?select=data&key=eq.${key}`, "no-store");
  const data = row?.data;
  return typeof data === "object" && data !== null && !Array.isArray(data) ? { ...(data as Record<string, unknown>) } : {};
}

async function writeContentData(key: string, data: Record<string, unknown>): Promise<void> {
  await upsertRow("content", { key, data, updated_at: new Date().toISOString() });
}

/** Новое фото в слот: старое загруженное удаляем с диска, файл по умолчанию не трогаем. */
export async function uploadArshPhoto(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const slot = field(formData, "slot");
  const photo = formData.get("photo");
  if (!PHOTO_SLOTS.some((item) => item.slot === slot)) return { ok: false, message: "Неизвестное место для фото" };
  if (!(photo instanceof File) || photo.size === 0) return { ok: false, message: "Выберите фото" };
  if (!PHOTO_TYPES[photo.type]) return { ok: false, message: "Подходят JPG, PNG или WebP" };
  if (photo.size > MAX_PHOTO_BYTES) return { ok: false, message: "Фото больше 5 МБ" };
  try {
    const data = await readContentData("photos");
    const url = await uploadPublicFile(`photos/${slot}-${randomUUID()}.${PHOTO_TYPES[photo.type]}`, await photo.arrayBuffer(), photo.type);
    const old = data[slot];
    data[slot] = url;
    await writeContentData("photos", data);
    if (typeof old === "string") await deletePublicFile(old).catch(() => undefined);
  } catch (error) {
    console.error("[admin] uploadArshPhoto", error);
    return { ok: false, message: "Не удалось загрузить фото. Попробуйте ещё раз." };
  }
  refreshSite(CONTENT_TAG);
  revalidatePath("/admin/photos");
  return { ok: true, message: "Фото заменено — уже на сайте" };
}

export async function resetArshPhoto(formData: FormData): Promise<void> {
  if (await guard()) return;
  const slot = field(formData, "slot");
  if (!PHOTO_SLOTS.some((item) => item.slot === slot)) return;
  try {
    const data = await readContentData("photos");
    const old = data[slot];
    delete data[slot];
    await writeContentData("photos", data);
    if (typeof old === "string") await deletePublicFile(old).catch(() => undefined);
  } catch (error) {
    console.error("[admin] resetArshPhoto", error);
  }
  refreshSite(CONTENT_TAG);
  revalidatePath("/admin/photos");
}

/** Оценки на Яндексе и в 2ГИС: число и подпись («54 оценки»). */
export async function saveReviewPlatforms(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const platforms: Record<string, { rating: number; ratingsLabel: string }> = {};
  for (const id of ["yandex", "2gis"]) {
    const rating = Number(field(formData, `${id}_rating`).replace(",", "."));
    const label = field(formData, `${id}_label`).slice(0, 40);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { ok: false, message: "Оценка — число от 1 до 5, например 4,8" };
    if (!label) return { ok: false, message: "Подпись, например «54 оценки»" };
    platforms[id] = { rating: Math.round(rating * 10) / 10, ratingsLabel: label };
  }
  try {
    const data = await readContentData("reviews");
    data.platforms = platforms;
    await writeContentData("reviews", data);
  } catch (error) {
    console.error("[admin] saveReviewPlatforms", error);
    return { ok: false, message: "Не удалось сохранить. Попробуйте ещё раз." };
  }
  refreshSite(CONTENT_TAG);
  revalidatePath("/admin/reviews");
  return { ok: true, message: "Оценки обновлены" };
}

type StoredReview = { id: string; author: string; date: string; platform: string; rating: number | null; text: string; directions: string[]; hidden?: boolean };

/** Список отзывов из базы; при первой правке переносим туда отзывы из кода. */
function storedReviews(data: Record<string, unknown>): StoredReview[] {
  if (Array.isArray(data.items)) return data.items as StoredReview[];
  return defaultReviewItems().map((review) => ({
    id: review.id ?? randomUUID(),
    author: review.author,
    date: review.date,
    platform: review.platform,
    rating: review.rating,
    text: review.text,
    directions: review.directions ?? [],
  }));
}

/** Добавить или поправить отзыв с площадки. Пустой id — новый отзыв. */
export async function saveReviewItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = field(formData, "id");
  const author = field(formData, "author").slice(0, 80);
  const date = field(formData, "date");
  const platform = field(formData, "platform");
  const ratingRaw = field(formData, "rating");
  const text = field(formData, "text").slice(0, 2000);
  const directions = formData.getAll("directions").filter((value): value is string => typeof value === "string" && defaultDirections.some((d) => d.slug === value));
  if (author.length < 2) return { ok: false, message: "Имя автора, как на площадке" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Дата отзыва" };
  if (platform !== "yandex" && platform !== "2gis") return { ok: false, message: "Площадка: Яндекс или 2ГИС" };
  if (text.length < 5) return { ok: false, message: "Текст отзыва" };
  const rating = ratingRaw ? Number(ratingRaw) : null;
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return { ok: false, message: "Оценка от 1 до 5 или пусто" };
  const hidden = formData.get("hidden") === "on";
  try {
    const data = await readContentData("reviews");
    const items = storedReviews(data);
    const review: StoredReview = { id: id || randomUUID(), author, date, platform, rating, text, directions, hidden };
    const index = items.findIndex((item) => item.id === id);
    if (id && index >= 0) items[index] = review;
    else items.unshift(review);
    data.items = items;
    await writeContentData("reviews", data);
  } catch (error) {
    console.error("[admin] saveReviewItem", error);
    return { ok: false, message: "Не удалось сохранить. Попробуйте ещё раз." };
  }
  refreshSite(CONTENT_TAG);
  revalidatePath("/admin/reviews");
  return { ok: true, message: id ? "Сохранено" : "Отзыв добавлен — уже на сайте" };
}

export async function deleteReviewItem(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  if (!id) return;
  try {
    const data = await readContentData("reviews");
    data.items = storedReviews(data).filter((item) => item.id !== id);
    await writeContentData("reviews", data);
  } catch (error) {
    console.error("[admin] deleteReviewItem", error);
  }
  refreshSite(CONTENT_TAG);
  revalidatePath("/admin/reviews");
}

/* ───────────── Цены из Excel / CSV ───────────── */

/**
 * Обновляет цены и вес по таблице: столбцы «Название», «Вес», «Цена» (порядок любой, первая строка — заголовки).
 * Подходит файл CSV из Excel или строки, скопированные прямо из Excel (через табуляцию).
 * Блюдо ищем по столбцу id, если он есть, иначе по названию. Новые блюда не создаём.
 */
export async function importPrices(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  let text = field(formData, "table");
  const file = formData.get("file");
  if (!text && file instanceof File && file.size > 0) {
    if (file.size > 1024 * 1024) return { ok: false, message: "Файл больше 1 МБ" };
    text = await readCsvFile(file);
  }
  if (!text) return { ok: false, message: "Вставьте строки из Excel или выберите файл CSV" };
  const parsed = parsePriceTable(text);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  try {
    const items = await selectRows<{ id: string; title: string; price: number | null; weight: string | null }>("menu_items", "?select=id,title,price,weight", "no-store");
    const byId = new Map(items.map((item) => [item.id, item]));
    const byTitle = new Map(items.map((item) => [normalizeTitle(item.title), item]));
    const missing: string[] = [];
    let changed = 0;
    for (const row of parsed.rows) {
      const item = (row.id && byId.get(row.id)) || byTitle.get(normalizeTitle(row.title));
      if (!item) {
        missing.push(row.title || row.id || "?");
        continue;
      }
      const patch: Record<string, unknown> = {};
      if (row.price !== undefined && row.price !== item.price) patch.price = row.price;
      if (row.weight !== undefined && row.weight !== item.weight) patch.weight = row.weight;
      if (Object.keys(patch).length === 0) continue;
      await updateRow("menu_items", item.id, { ...patch, updated_at: new Date().toISOString() });
      changed++;
    }
    refreshSite(MENU_TAG);
    revalidatePath("/admin/menu");
    const tail = missing.length ? ` Не нашли в меню: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}.` : "";
    return { ok: missing.length === 0, message: `Обновлено блюд: ${changed}.${tail}` };
  } catch (error) {
    console.error("[admin] importPrices", error);
    return { ok: false, message: "Не удалось обновить цены. Попробуйте ещё раз." };
  }
}

/* ───────────── Клиенты (CRM) ───────────── */

const STAR_SLUGS = ["mangal", "sshp", "catering", "events", "host"];

/** «14.03», «14.03.1990» или «1990-03-14» → день, месяц, год. */
function parseBirthday(raw: string): { day: number | null; month: number | null; year: number | null } | "bad" {
  const value = raw.trim();
  if (!value) return { day: null, month: null, year: null };
  let match = value.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?$/);
  let day: number, month: number, year: number | null;
  if (match) {
    day = Number(match[1]);
    month = Number(match[2]);
    year = match[3] ? Number(match[3]) : null;
  } else {
    match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "bad";
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || (year !== null && (year < 1900 || year > 2100))) return "bad";
  return { day, month, year };
}

/** Новый клиент или правка. Телефон — ключ от дублей: второй раз тот же номер не заведётся. */
export async function saveClient(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = field(formData, "id");
  const name = field(formData, "name").slice(0, 80);
  const lastName = field(formData, "last_name").slice(0, 80) || null;
  const phoneRaw = field(formData, "phone");
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const birthday = parseBirthday(field(formData, "birthday"));
  if (name.length < 1) return { ok: false, message: "Имя клиента" };
  if (phoneRaw && !phone) return { ok: false, message: "Телефон в формате +7 900 123-45-67" };
  if (birthday === "bad") return { ok: false, message: "День рождения в виде 14.03 или 14.03.1990" };
  const nextAt = field(formData, "next_step_at");
  const row = {
    name,
    last_name: lastName,
    phone,
    company: field(formData, "company").slice(0, 120) || null,
    is_company: formData.get("is_company") === "on",
    birth_day: birthday.day,
    birth_month: birthday.month,
    birth_year: birthday.year,
    occasion: field(formData, "occasion").slice(0, 200) || null,
    source: field(formData, "source").slice(0, 120) || null,
    consent_ads: formData.get("consent_ads") === "on",
    next_step: field(formData, "next_step").slice(0, 300) || null,
    next_step_at: /^\d{4}-\d{2}-\d{2}$/.test(nextAt) ? nextAt : null,
    note: field(formData, "note").slice(0, 2000) || null,
    tier_manual: ["guest", "friend", "own", "card"].includes(field(formData, "tier_manual")) ? field(formData, "tier_manual") : null,
    mark_back: formData.get("mark_back") === "on",
    updated_at: new Date().toISOString(),
  };
  try {
    if (phone) {
      const [same] = await selectRows<{ id: string; num: number; name: string }>("clients", `?select=id,num,name&phone=eq.${encodeURIComponent(phone)}`, "no-store");
      if (same && same.id !== id) return { ok: false, message: `Этот номер уже у клиента AP-${String(same.num).padStart(4, "0")} (${same.name}). Откройте его или объедините.` };
    }
    if (id) await updateRow("clients", id, row);
    else await insertRow("clients", row);
  } catch (error) {
    console.error("[admin] saveClient", error);
    return { ok: false, message: "Не удалось сохранить. Попробуйте ещё раз." };
  }
  revalidatePath("/admin/clients");
  return { ok: true, message: id ? "Сохранено" : "Клиент добавлен" };
}

/** Прошлый или офлайн-заказ клиента: дата, сумма, звёзды. */
export async function addClientOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const clientId = field(formData, "client_id");
  const date = field(formData, "date");
  const amount = Math.round(Number(field(formData, "amount").replace(/[\s ₽]/g, "").replace(",", ".")));
  const stars = formData.getAll("stars").filter((value): value is string => typeof value === "string" && STAR_SLUGS.includes(value));
  if (!UUID.test(clientId)) return { ok: false, message: "Клиент не выбран" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Дата заказа" };
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, message: "Сумма в рублях" };
  try {
    await insertRow("client_orders", { client_id: clientId, order_date: date, amount, stars, note: field(formData, "note").slice(0, 500) || null, source: "manual", verified: true });
  } catch (error) {
    console.error("[admin] addClientOrder", error);
    return { ok: false, message: "Не удалось добавить заказ." };
  }
  revalidatePath("/admin/clients");
  return { ok: true, message: `Заказ на ${amount.toLocaleString("ru-RU")} ₽ добавлен` };
}

export async function verifyClientOrder(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  const amount = field(formData, "amount");
  if (!UUID.test(id)) return;
  const patch: Record<string, unknown> = { verified: true };
  if (amount) {
    const value = Math.round(Number(amount.replace(/[\s ₽]/g, "")));
    if (Number.isFinite(value) && value >= 0) patch.amount = value;
  }
  try {
    await updateRow("client_orders", id, patch);
  } catch (error) {
    console.error("[admin] verifyClientOrder", error);
  }
  revalidatePath("/admin/clients");
}

export async function deleteClientOrder(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  if (!UUID.test(id)) return;
  try {
    await deleteRow("client_orders", id);
  } catch (error) {
    console.error("[admin] deleteClientOrder", error);
  }
  revalidatePath("/admin/clients");
}

/** Объединить дубль: заказы переезжают к основному клиенту, пустые поля основного заполняются, дубль удаляется. */
export async function mergeClients(_: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guard();
  if (blocked) return blocked;
  const fromId = field(formData, "from");
  const target = field(formData, "into").toUpperCase().replace(/[^0-9]/g, "");
  if (!UUID.test(fromId) || !target) return { ok: false, message: "Укажите номер основного клиента, например AP-0012" };
  try {
    const [from] = await selectRows<ClientRow>("clients", `?select=*&id=eq.${fromId}`, "no-store");
    const [into] = await selectRows<ClientRow>("clients", `?select=*&num=eq.${Number(target)}`, "no-store");
    if (!from || !into) return { ok: false, message: "Клиент не найден" };
    if (from.id === into.id) return { ok: false, message: "Это один и тот же клиент" };
    const orders = await selectRows<{ id: string }>("client_orders", `?select=id&client_id=eq.${from.id}`, "no-store");
    for (const order of orders) await updateRow("client_orders", order.id, { client_id: into.id });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ["last_name", "company", "birth_day", "birth_month", "birth_year", "occasion", "source", "next_step", "next_step_at"] as const) {
      if (into[key] === null && from[key] !== null) patch[key] = from[key];
    }
    if (!into.consent_ads && from.consent_ads) patch.consent_ads = true;
    if (from.note) patch.note = [into.note, from.note].filter(Boolean).join("\n").slice(0, 2000);
    const fromPhone = from.phone;
    await deleteRow("clients", from.id);
    if (!into.phone && fromPhone) patch.phone = fromPhone;
    await updateRow("clients", into.id, patch);
  } catch (error) {
    console.error("[admin] mergeClients", error);
    return { ok: false, message: "Не удалось объединить. Попробуйте ещё раз." };
  }
  revalidatePath("/admin/clients");
  return { ok: true, message: "Объединено" };
}

export async function deleteClient(formData: FormData): Promise<void> {
  if (await guard()) return;
  const id = field(formData, "id");
  if (!UUID.test(id)) return;
  try {
    await deleteRow("clients", id);
  } catch (error) {
    console.error("[admin] deleteClient", error);
  }
  revalidatePath("/admin/clients");
}

/**
 * Стартовый список из файла private/clients-start.json (собран из переписки WhatsApp и Telegram).
 * Повторный запуск ничего не дублирует: у каждой строки свой import_key, телефон уникален.
 * Суммы из переписки помечены «проверить» — подтвердите или поправьте их в карточке клиента.
 */
export async function importClientsStart(_: ActionState, formData: FormData): Promise<ActionState> {
  void formData;
  const blocked = await guard();
  if (blocked) return blocked;
  type SeedOrder = { date: string; amount: number };
  type SeedClient = { key: string; name: string; phone: string | null; source: string | null; orders: SeedOrder[] };
  let seed: SeedClient[];
  try {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    seed = JSON.parse(await readFile(path.join(process.cwd(), "private", "clients-start.json"), "utf8")) as SeedClient[];
  } catch {
    return { ok: false, message: "Файл стартового списка не найден на сервере (private/clients-start.json)." };
  }
  let added = 0;
  let orders = 0;
  try {
    const existing = await selectRows<{ id: string; phone: string | null; import_key: string | null }>("clients", "?select=id,phone,import_key&limit=10000", "no-store");
    const byKey = new Map(existing.filter((row) => row.import_key).map((row) => [row.import_key as string, row.id]));
    const byPhone = new Map(existing.filter((row) => row.phone).map((row) => [row.phone as string, row.id]));
    const orderKeys = new Set(
      (await selectRows<{ import_key: string | null }>("client_orders", "?select=import_key&import_key=not.is.null&limit=20000", "no-store")).map((row) => row.import_key),
    );
    for (const client of seed) {
      const phone = client.phone && /^\+7\d{10}$/.test(client.phone) ? client.phone : null;
      let id = byKey.get(client.key) ?? (phone ? byPhone.get(phone) : undefined);
      if (!id) {
        const row = await insertRow<{ id: string }>("clients", {
          name: client.name.slice(0, 80) || "Без имени",
          phone,
          source: client.source ? `переписка: ${client.source}` : "переписка",
          import_key: client.key,
        });
        id = row.id;
        added++;
      }
      for (const order of client.orders) {
        const key = `${client.key}:${order.date}:${order.amount}`;
        if (orderKeys.has(key)) continue;
        await insertRow("client_orders", {
          client_id: id,
          order_date: order.date,
          amount: order.amount,
          note: "сумма из переписки — проверить",
          source: "import",
          verified: false,
          import_key: key,
        });
        orderKeys.add(key);
        orders++;
      }
    }
  } catch (error) {
    console.error("[admin] importClientsStart", error);
    return { ok: false, message: `Загрузка прервалась (добавлено клиентов: ${added}). Нажмите ещё раз — дубли не появятся.` };
  }
  revalidatePath("/admin/clients");
  return { ok: true, message: `Добавлено клиентов: ${added}, заказов из переписки: ${orders}.` };
}

/** Показывать ли «Гонку квартала» в личном кабинете (имя и 4 последние цифры). */
export async function setRaceVisible(formData: FormData): Promise<void> {
  if (await guard()) return;
  try {
    const data = await readContentData("zvezda");
    data.raceVisible = formData.get("on") === "1";
    await writeContentData("zvezda", data);
  } catch (error) {
    console.error("[admin] setRaceVisible", error);
  }
  refreshSite(CONTENT_TAG);
  revalidatePath("/admin/clients");
}
