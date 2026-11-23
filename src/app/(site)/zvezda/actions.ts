"use server";

import { redirect } from "next/navigation";
import { checkZvezdaPassword, isZvezdaConfigured, startZvezdaSession } from "@/lib/zvezda";

export type GateState = { error: string } | null;

/** Пароль с визитки → вход на 30 дней. */
export async function enterZvezda(_: GateState, formData: FormData): Promise<GateState> {
  if (!isZvezdaConfigured()) return { error: "Тайная страница ещё закрыта." };
  const password = String(formData.get("password") ?? "");
  if (!checkZvezdaPassword(password)) return { error: "Не тот пароль. Посмотрите на обороте визитки." };
  await startZvezdaSession();
  redirect("/zvezda");
}
