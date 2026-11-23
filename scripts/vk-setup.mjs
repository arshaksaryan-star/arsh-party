/**
 * Подключает уведомления в личку VK от сообщества: находит, кто написал сообществу,
 * вписывает его id в .env.local (VK_NOTIFY_USER_IDS) и присылает пробное сообщение.
 * Перед запуском: VK_GROUP_TOKEN вписан в .env.local, вы написали сообществу «привет».
 * Запуск из папки arsh-party:  node scripts/vk-setup.mjs
 * Ключ на экран не выводится.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync(".env.local")) {
  console.log("Не нашёл .env.local. Запустите команду из папки arsh-party.");
  process.exit(1);
}
let text = readFileSync(".env.local", "utf8");
const line = text.match(/^\s*VK_GROUP_TOKEN\s*=\s*(.*)\s*$/m);
const token = line ? line[1].replace(/^["']|["']$/g, "").trim() : "";
if (token.length < 40) {
  console.log("В .env.local нет ключа сообщества: добавьте строку VK_GROUP_TOKEN=… (ключ из «Управление» → «Работа с API»).");
  process.exit(1);
}

async function vk(method, params = {}) {
  const body = new URLSearchParams({ access_token: token, v: "5.199", ...params });
  try {
    const response = await fetch(`https://api.vk.com/method/${method}`, { method: "POST", body, signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (data.error) {
      console.log(`VK ответил ошибкой ${data.error.error_code}: ${data.error.error_msg}`);
      if (data.error.error_code === 5) console.log("Ключ не подходит — создайте ключ сообщества заново.");
      if (data.error.error_code === 15 || data.error.error_code === 27) console.log("Проверьте, что у ключа отмечен доступ к сообщениям сообщества.");
      process.exit(1);
    }
    return data.response;
  } catch {
    console.log("Нет связи с VK. Проверьте интернет и запустите ещё раз.");
    process.exit(1);
  }
}

const groups = await vk("groups.getById");
const group = (groups.groups ?? groups)[0];
console.log(`✓ Сообщество: ${group?.name ?? "?"}`);

const conversations = await vk("messages.getConversations", { count: "20" });
const users = (conversations.items ?? [])
  .map((item) => item.conversation?.peer)
  .filter((peer) => peer?.type === "user")
  .map((peer) => peer.id);
if (users.length === 0) {
  console.log("Сообществу ещё никто не писал. Напишите ему «привет» со своей страницы VK и запустите команду ещё раз.");
  console.log("Если писали — включите «Сообщения сообщества» в «Управление» → «Сообщения».");
  process.exit(1);
}
const me = users[0];
const [person] = await vk("users.get", { user_ids: String(me) });
const name = person ? `${person.first_name} ${person.last_name}` : `id${me}`;

if (/^\s*VK_NOTIFY_USER_IDS\s*=.*$/m.test(text)) text = text.replace(/^\s*VK_NOTIFY_USER_IDS\s*=.*$/m, `VK_NOTIFY_USER_IDS=${me}`);
else text = `${text.replace(/\s*$/, "")}\nVK_NOTIFY_USER_IDS=${me}\n`;
writeFileSync(".env.local", text);
console.log(`✓ Получатель: ${name} (id${me}) — записал в .env.local`);
console.log("  Если это не вы — напишите сообществу со своей страницы и запустите команду ещё раз.");

await vk("messages.send", {
  peer_id: String(me),
  random_id: String(Math.floor(Math.random() * 2 ** 31)),
  message: "🔥 Arsh Party: уведомления о заказах и заявках подключены.",
});
console.log("✓ Пробное сообщение отправлено — проверьте сообщения VK.");
