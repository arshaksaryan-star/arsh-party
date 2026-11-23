import "server-only";

/**
 * Доставка кода входа в личный кабинет — только SMS через SMSC.ru (решение владельца, 14.11.2026).
 *
 * Переменные окружения (.env.local): SMSC_LOGIN и SMSC_PASSWORD — логин и пароль SMSC.ru.
 */

export type Channel = "sms";

export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMSC_LOGIN && process.env.SMSC_PASSWORD);
}

/** Отправляет SMS с кодом. true — SMSC принял сообщение. */
export async function deliverCode(phone: string, code: string): Promise<boolean> {
  if (!isSmsConfigured()) return false;
  const params = new URLSearchParams({
    login: process.env.SMSC_LOGIN ?? "",
    psw: process.env.SMSC_PASSWORD ?? "",
    phones: phone.replace(/\D/g, ""),
    mes: `Arsh Party: код входа ${code}`,
    fmt: "3",
    charset: "utf-8",
  });
  try {
    const response = await fetch("https://smsc.ru/sys/send.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await response.json().catch(() => ({}))) as { id?: number; error?: string; error_code?: number };
    if (data.error) console.error("[login] smsc", data.error_code, data.error);
    return Boolean(data.id) && !data.error;
  } catch (error) {
    console.error("[login] smsc", error);
    return false;
  }
}
