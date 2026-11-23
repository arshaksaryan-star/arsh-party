/**
 * Уведомления владельцу в личные сообщения VK от имени сообщества (метод messages.send).
 * Нужны: VK_GROUP_TOKEN — ключ сообщества с доступом к сообщениям,
 * VK_NOTIFY_USER_IDS — id страниц, куда писать (через запятую; находит scripts/vk-setup.mjs).
 * Получатель должен один раз написать сообществу — иначе VK не даст сообществу писать ему.
 */

const VK_API_VERSION = "5.199";

export function isVkNotifyConfigured(): boolean {
  return Boolean(process.env.VK_GROUP_TOKEN && vkRecipients().length > 0);
}

function vkRecipients(): number[] {
  return (process.env.VK_NOTIFY_USER_IDS ?? "")
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

/** Сообщение для Telegram размечено HTML; VK понимает только простой текст. */
export function htmlToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export async function sendVkMessage(text: string): Promise<void> {
  const token = process.env.VK_GROUP_TOKEN;
  const peers = vkRecipients();
  if (!token || peers.length === 0) throw new Error("VK не настроен: нет VK_GROUP_TOKEN или VK_NOTIFY_USER_IDS");

  const body = new URLSearchParams({
    access_token: token,
    v: VK_API_VERSION,
    peer_ids: peers.join(","),
    random_id: String(Math.floor(Math.random() * 2 ** 31)),
    message: text.slice(0, 4000),
    dont_parse_links: "1",
  });
  const response = await fetch("https://api.vk.com/method/messages.send", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: { error_msg?: string; error_code?: number };
    response?: { peer_id: number; error?: { description?: string } }[];
  };
  if (data.error) throw new Error(`VK: ${data.error.error_code} ${data.error.error_msg ?? ""}`);
  const delivered = (data.response ?? []).filter((item) => !item.error);
  if (delivered.length === 0) {
    const reason = data.response?.find((item) => item.error)?.error?.description ?? "нет ответа";
    throw new Error(`VK: сообщение не доставлено (${reason})`);
  }
}
