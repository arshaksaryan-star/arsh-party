/**
 * Уведомления владельцу в Telegram через Bot API (метод sendMessage).
 * Работает только на сервере: токен берётся из переменных окружения.
 */

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/** Экранирование для parse_mode=HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(html: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram не настроен: нет TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID");

  // TELEGRAM_API_BASE — адрес посредника, если сервер в России не достаёт до api.telegram.org.
  const base = (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");
  const response = await fetch(`${base}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    cache: "no-store",
    // Из России Telegram бывает недоступен: не держим заказ дольше 8 секунд.
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Telegram ответил ${response.status}: ${details.slice(0, 300)}`);
  }
}
