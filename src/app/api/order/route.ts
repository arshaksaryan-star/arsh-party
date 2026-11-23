import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { loadContent, CONTENT_TAG } from "@/lib/content";
import { formatPhone } from "@/lib/lead";
import type { MenuItem } from "@/lib/menu";
import { computeTotals, formatRub, orderSettings, validateOrder, zoneOptions, type OrderInput, type PricedLine } from "@/lib/order";
import { insertRow, isSupabaseConfigured, selectRows, updateRow } from "@/lib/supabase";
import { escapeHtml, isNotifyConfigured, notifyOwner } from "@/lib/notify";
import { activePerks, type FriendPerk } from "@/lib/zvezda-shared";
import { ambassadorByCode, ambassadorBySecret, balanceOf, loadZvezda } from "@/lib/zvezda";
import { coinsSpendable, COIN_CAP_MANGAL } from "@/lib/ambassadors";

/**
 * Приём заказа с мангала.
 * Цены и наличие сервер берёт из базы (не из браузера), считает сумму и доставку сам,
 * пишет заказ в базу (получает номер) и отправляет уведомление в Telegram и VK.
 */

type OrderRow = { id: string; number: number };

type Extras = { refCode: string | null; friendOf: string | null; perks: FriendPerk[]; payer: string | null };

function telegramText(order: OrderInput, number: number | null, lines: PricedLine[], totals: ReturnType<typeof computeTotals>, zoneLabel: string, extras: Extras): string {
  const out = [`🔥 <b>Заказ с мангала${number ? ` №${number}` : ""}</b>`, ""];
  for (const line of lines) {
    const sum = line.price === null ? "цена уточняется" : formatRub(line.price * line.qty);
    out.push(`• ${escapeHtml(line.title)} × ${line.qty} — ${sum}`);
  }
  out.push("");
  out.push(`Блюда: ${formatRub(totals.subtotal)}${totals.hasUnpriced ? " + уточнить" : ""}`);
  out.push(`Доставка (${escapeHtml(zoneLabel)}): ${totals.fee === null ? "согласовать" : formatRub(totals.fee)}`);
  if (totals.coins > 0) out.push(`Шашлыкоины (${escapeHtml(extras.payer ?? "")}): −${formatRub(totals.coins)}`);
  out.push(`<b>Итого: ${totals.total === null ? "уточнить по телефону" : formatRub(totals.total)}</b>`);
  out.push("");
  out.push(`Имя: ${escapeHtml(order.name)}`);
  out.push(`Телефон: ${escapeHtml(formatPhone(order.phone))}`);
  out.push(`Адрес: ${escapeHtml(order.address)}`);
  out.push(`Когда: ${order.deliverAt === "asap" ? "как можно скорее" : `к ${order.deliverAt}`}`);
  out.push(`Оплата: ${order.payment === "cash" ? "наличными" : "картой / переводом"}`);
  if (order.comment) out.push("", `Комментарий: ${escapeHtml(order.comment)}`);
  if (extras.refCode && extras.friendOf) {
    out.push("", `⭐ По коду друга <b>${extras.refCode}</b> (${escapeHtml(extras.friendOf)})`);
    if (extras.perks.length > 0) out.push(`Положить плюшки: ${extras.perks.map((perk) => escapeHtml(perk.title)).join(", ")}`);
  }
  return out.join("\n");
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать заказ. Обновите страницу и попробуйте ещё раз." }, { status: 400 });
  }

  const result = validateOrder(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors, error: "Проверьте поля формы." }, { status: 422 });
  const order = result.order;

  // Без базы нельзя проверить цены и наличие — заказ не принимаем, просим позвонить.
  if (!isSupabaseConfigured()) {
    console.error("[order] Supabase не настроен — меню и цены проверить нельзя");
    return NextResponse.json({ error: "Онлайн-заказ временно не работает. Позвоните нам — примем по телефону." }, { status: 503 });
  }

  let menu: MenuItem[];
  try {
    const ids = order.items.map((item) => item.id).join(",");
    menu = await selectRows<MenuItem>("menu_items", `?select=id,title,price,is_available&id=in.(${ids})`, "no-store");
  } catch (error) {
    console.error("[order] menu:", error);
    return NextResponse.json({ error: "Не получилось проверить меню. Попробуйте через минуту или позвоните нам." }, { status: 502 });
  }

  const byId = new Map(menu.map((item) => [item.id, item]));
  const gone = order.items.filter((item) => !byId.get(item.id)?.is_available);
  if (gone.length > 0) {
    const titles = gone.map((item) => byId.get(item.id)?.title).filter(Boolean);
    const what = titles.length ? `«${titles.join("», «")}»` : "Часть блюд";
    return NextResponse.json({ error: `${what} уже закончилось. Меню обновлено — проверьте заказ.`, stale: true }, { status: 409 });
  }

  const lines: PricedLine[] = order.items.map((item) => {
    const dish = byId.get(item.id) as MenuItem;
    return { id: dish.id, title: dish.title, qty: item.qty, price: dish.price };
  });

  const { site } = await loadContent({ revalidate: 300, tags: [CONTENT_TAG] });
  const settings = orderSettings(site);
  const zone = zoneOptions(settings).find((option) => option.value === order.zone);
  if (!zone) return NextResponse.json({ errors: { zone: "Выберите, куда везти" }, error: "Проверьте поля формы." }, { status: 422 });
  // Код друга: плюшки, которые сейчас включены в админке. Свой код себе не действует.
  const extras: Extras = { refCode: null, friendOf: null, perks: [], payer: null };
  let coinsWanted = 0;
  let payerId: string | null = null;
  try {
    if (order.refCode) {
      const friend = await ambassadorByCode(order.refCode);
      if (friend && friend.status === "active" && friend.phone !== order.phone) {
        extras.refCode = friend.code;
        extras.friendOf = friend.name;
        extras.perks = activePerks((await loadZvezda()).perks);
      }
    }
    if (order.useCoins && order.ambSecret) {
      const payer = await ambassadorBySecret(order.ambSecret);
      if (payer && payer.status === "active") {
        payerId = payer.id;
        extras.payer = payer.name;
        coinsWanted = await balanceOf(payer.id);
      }
    }
  } catch (error) {
    // Программа амбассадоров недоступна — заказ всё равно принимаем, без плюшек и коинов.
    console.error("[order] ambassadors:", error);
  }
  const freeDelivery = extras.perks.some((perk) => perk.freeDelivery);
  const base = computeTotals(lines, order.zone, settings, { freeDelivery });
  const totals = computeTotals(lines, order.zone, settings, { freeDelivery, coins: coinsSpendable(coinsWanted, base.subtotal, COIN_CAP_MANGAL) });
  if (totals.missing > 0) {
    return NextResponse.json({ error: `Минимальный заказ — ${formatRub(settings.minSum)}. Добавьте ещё на ${formatRub(totals.missing)}.`, stale: true }, { status: 422 });
  }

  let saved: OrderRow | null = null;
  try {
    saved = await insertRow<OrderRow>("orders", {
      client_id: order.clientId ?? randomUUID(),
      name: order.name,
      phone: order.phone,
      address: order.address,
      deliver_at: order.deliverAt,
      payment: order.payment,
      comment: order.comment,
      items: lines,
      subtotal: totals.subtotal,
      delivery_zone: order.zone,
      delivery_fee: totals.fee,
      total: totals.total,
      ref_code: extras.refCode,
      coins_used: totals.coins,
    });
  } catch (error) {
    console.error("[order] Supabase:", error);
  }

  // Списываем шашлыкоины, только если заказ записан. Не вышло — заказ без скидки.
  let finalTotals = totals;
  if (totals.coins > 0) {
    let spent = false;
    if (saved && payerId) {
      try {
        await insertRow("coin_ledger", { ambassador_id: payerId, amount: -totals.coins, reason: "spend", order_id: saved.id, note: `Заказ №${saved.number}` });
        spent = true;
      } catch (error) {
        console.error("[order] coins:", error);
      }
    }
    if (!spent) {
      finalTotals = computeTotals(lines, order.zone, settings, { freeDelivery });
      if (saved) await updateRow("orders", saved.id, { coins_used: 0, total: finalTotals.total }).catch(() => undefined);
    }
  }

  let notified = false;
  if (isNotifyConfigured()) {
    try {
      await notifyOwner(telegramText(order, saved?.number ?? null, lines, finalTotals, zone.label, extras));
      notified = true;
    } catch (error) {
      console.error("[order] notify:", error);
    }
  }

  if (saved && notified) {
    await updateRow("orders", saved.id, { telegram_sent: true }).catch((error) => console.error("[order] Supabase update:", error));
  }

  if (!saved && !notified) {
    return NextResponse.json({ error: "Не получилось отправить заказ. Позвоните нам — примем по телефону." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, number: saved?.number ?? null, total: finalTotals.total, coins: finalTotals.coins });
}
