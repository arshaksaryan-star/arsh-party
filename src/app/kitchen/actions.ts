"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  canUseKitchen,
  checkKitchenPassword,
  endKitchenSession,
  isKitchenConfigured,
  startKitchenSession,
} from "@/lib/admin-session";
import { MENU_TAG, validateMenuItem } from "@/lib/menu";
import { insertRow, isSupabaseConfigured, updateRow } from "@/lib/supabase";

export type KitchenState = { ok: boolean; message: string } | null;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Меню на сайте и список на кухне обновляются сразу. */
function refresh() {
  revalidateTag(MENU_TAG);
  revalidatePath("/kitchen");
  revalidatePath("/mangal");
  revalidatePath("/admin/menu");
}

export async function kitchenLogin(_: KitchenState, formData: FormData): Promise<KitchenState> {
  if (!isKitchenConfigured()) {
    return { ok: false, message: "Пароль кухни не задан: добавьте KITCHEN_PASSWORD в настройки сервера." };
  }
  if (!checkKitchenPassword(field(formData, "password"))) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { ok: false, message: "Неверный пароль" };
  }
  await startKitchenSession();
  redirect("/kitchen");
}

export async function kitchenLogout(): Promise<void> {
  await endKitchenSession();
  redirect("/kitchen/login");
}

/** Есть сегодня / нет: одно нажатие на позицию. */
export async function setAvailability(formData: FormData): Promise<void> {
  if (!(await canUseKitchen()) || !isSupabaseConfigured()) return;
  const id = field(formData, "id");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const available = field(formData, "available") === "true";
  try {
    await updateRow("menu_items", id, { is_available: available, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error("[kitchen] setAvailability", error);
    return;
  }
  refresh();
}

/** Конец дня: всё скрыть, утром включить то, что приготовили. */
export async function hideAll(formData: FormData): Promise<void> {
  if (!(await canUseKitchen()) || !isSupabaseConfigured()) return;
  const ids = formData.getAll("id").filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id));
  try {
    await Promise.all(ids.map((id) => updateRow("menu_items", id, { is_available: false, updated_at: new Date().toISOString() })));
  } catch (error) {
    console.error("[kitchen] hideAll", error);
    return;
  }
  refresh();
}

/** Быстро добавить блюдо дня: сразу появляется в меню. Фото и описание — потом в админке. */
export async function addTodayItem(_: KitchenState, formData: FormData): Promise<KitchenState> {
  if (!(await canUseKitchen())) return { ok: false, message: "Войдите заново." };
  if (!isSupabaseConfigured()) return { ok: false, message: "База не подключена." };
  const result = validateMenuItem({
    title: field(formData, "title"),
    category: field(formData, "category"),
    price: field(formData, "price"),
    weight: field(formData, "weight"),
    description: "",
    is_available: true,
    sort: "100",
  });
  if (!result.ok) return { ok: false, message: result.error };
  try {
    await insertRow("menu_items", { id: randomUUID(), ...result.item, is_available: true, image_url: null });
  } catch (error) {
    console.error("[kitchen] addTodayItem", error);
    return { ok: false, message: "Не удалось добавить. Проверьте интернет и попробуйте ещё раз." };
  }
  refresh();
  return { ok: true, message: `«${result.item.title}» добавлено в меню на сегодня` };
}
