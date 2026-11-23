import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram";
import { htmlToPlain, isVkNotifyConfigured, sendVkMessage } from "@/lib/vk-notify";

/**
 * Уведомление владельцу о заказе, заявке или отзыве — сразу во все настроенные каналы:
 * Telegram и личные сообщения VK. Каналы работают независимо: если из России
 * недоступен Telegram, сообщение всё равно придёт в VK. Успех — хотя бы один канал.
 */

export { escapeHtml } from "@/lib/telegram";

export function isNotifyConfigured(): boolean {
  return isTelegramConfigured() || isVkNotifyConfigured();
}

export async function notifyOwner(html: string): Promise<void> {
  const jobs: Promise<void>[] = [];
  if (isTelegramConfigured()) jobs.push(sendTelegramMessage(html));
  if (isVkNotifyConfigured()) jobs.push(sendVkMessage(htmlToPlain(html)));
  if (jobs.length === 0) throw new Error("Уведомления не настроены: нет ни Telegram, ни VK");

  const results = await Promise.allSettled(jobs);
  const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  for (const failure of failed) console.error("[notify]", failure.reason);
  if (failed.length === results.length) throw new Error("Ни один канал уведомлений не сработал");
}
