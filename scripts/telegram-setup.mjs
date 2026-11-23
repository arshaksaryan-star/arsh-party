/**
 * Находит номер чата для уведомлений и вписывает его в .env.local (TELEGRAM_CHAT_ID).
 * Перед запуском: TELEGRAM_BOT_TOKEN вписан в .env.local, боту отправлено любое сообщение.
 * Запуск из папки arsh-party:  node scripts/telegram-setup.mjs
 * Токен на экран не выводится. В конце бот присылает пробное сообщение.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync(".env.local")) {
  console.log("Не нашёл .env.local. Запустите команду из папки arsh-party.");
  process.exit(1);
}
let text = readFileSync(".env.local", "utf8");
const tokenLine = text.match(/^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.*)\s*$/m);
const token = tokenLine ? tokenLine[1].replace(/^["']|["']$/g, "").trim() : "";
if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) {
  console.log("В .env.local нет токена бота или он неполный: строка должна быть TELEGRAM_BOT_TOKEN=123456789:AA…");
  process.exit(1);
}

async function call(method, body) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(15000),
    });
    return await response.json();
  } catch {
    console.log("Нет связи с Telegram. Включите VPN и запустите ещё раз.");
    process.exit(1);
  }
}

const me = await call("getMe");
if (!me.ok) {
  console.log("Telegram не принял токен. Скопируйте его из @BotFather заново.");
  process.exit(1);
}
const updates = await call("getUpdates", { limit: 100 });
const chats = new Map();
for (const update of updates.result ?? []) {
  const chat = (update.message ?? update.my_chat_member ?? update.channel_post)?.chat;
  if (chat) chats.set(chat.id, chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || "чат");
}
if (chats.size === 0) {
  console.log(`Бот @${me.result.username} пока не видит сообщений. Откройте его в Telegram, нажмите Start, напишите «привет» и запустите команду ещё раз.`);
  process.exit(1);
}
const [chatId, name] = [...chats.entries()].at(-1);
if (/^\s*TELEGRAM_CHAT_ID\s*=.*$/m.test(text)) text = text.replace(/^\s*TELEGRAM_CHAT_ID\s*=.*$/m, `TELEGRAM_CHAT_ID=${chatId}`);
else text = `${text.replace(/\s*$/, "")}\nTELEGRAM_CHAT_ID=${chatId}\n`;
writeFileSync(".env.local", text);
console.log(`✓ Чат найден: ${name} (${chatId}) — записал в .env.local`);

const sent = await call("sendMessage", { chat_id: chatId, text: "🔥 Arsh Party: уведомления о заказах и заявках подключены." });
console.log(sent.ok ? "✓ Пробное сообщение отправлено — проверьте Telegram." : "✗ Пробное сообщение не ушло: " + (sent.description ?? ""));
