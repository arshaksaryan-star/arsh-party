/**
 * Разовая загрузка блюд мангала в меню (таблица menu_items в Supabase).
 * Запуск: на сервере — из deploy/import-data.sh; на компьютере — node scripts/import-dishes.mjs
 *
 * - Фото уже лежат в public/menu/ (сайт отдаёт их сам).
 * - Блюдо с таким же названием не дублируется: ему только ставится фото, если фото не было.
 * - Цены и вес — от владельца (14.11.2026); где «null» — «Цена уточняется», поправить в админке.
 * - Ключи берутся из .env.local и на экран не выводятся.
 */
import { readFileSync, existsSync } from "node:fs";

const DISHES = [
  { title: "Шея свиная", category: "shashlik", photo: "sheya", price: 600, weight: "230 г" },
  { title: "Карбонат свиной", category: "shashlik", photo: "karbonat", price: 600, weight: "240 г" },
  { title: "Карбонат на кости", category: "shashlik", photo: "karbonat-kost", price: 725, weight: "440 г" },
  { title: "Боковые рёбрышки", category: "shashlik", photo: "rebryshki", price: null, weight: null },
  { title: "Каре баранины", category: "shashlik", photo: "kare", price: 950, weight: "250 г" },
  { title: "Куриная грудка", category: "chicken", photo: "grudka", price: 550, weight: "240 г" },
  { title: "Куриные крылышки", category: "chicken", photo: "krylyshki", price: 350, weight: null },
  { title: "Куриная голень", category: "chicken", photo: "golen", price: 350, weight: null },
  { title: "Люля-кебаб", category: "lulya", photo: "lulya", price: 450, weight: "250 г" },
  { title: "Речная форель", category: "fish", photo: "forel", price: null, weight: null },
  { title: "Стейк из сёмги", category: "fish", photo: "semga", price: null, weight: null },
  { title: "Картофель фри", category: "sides", photo: "fri", price: 275, weight: "150 г" },
  { title: "Картофель по-деревенски", category: "sides", photo: "derevenski", price: 275, weight: "150 г" },
  { title: "Лаваш", category: "sides", photo: null, price: 50, weight: "1 порция" },
  { title: "Соус красный", category: "sauces", photo: null, price: 85, weight: "50 г" },
  { title: "Соус белый", category: "sauces", photo: null, price: 85, weight: "50 г" },
  { title: "Ассорти с мангала", category: "sets", photo: "assorti", price: null, weight: null },
];

function readEnv() {
  const env = { ...process.env };
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = readEnv();
// На своём сервере — PostgREST внутри сервера, без ключа; на компьютере — Supabase.
const rest = env.POSTGREST_URL
  ? env.POSTGREST_URL.replace(/\/+$/, "")
  : `${(env.SUPABASE_URL || "").replace(/\/+$/, "")}/rest/v1`;
const key = env.POSTGREST_URL ? "" : env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!env.POSTGREST_URL && (!env.SUPABASE_URL || !key)) {
  console.log("Нет адреса базы: в .env.local нет SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const headers = { "Content-Type": "application/json", Prefer: "return=minimal" };
if (key) headers.apikey = key;
if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

const normalize = (text) => text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

async function main() {
  let response;
  try {
    response = await fetch(`${rest}/menu_items?select=id,title,image_url`, { headers });
  } catch {
    console.log("Нет связи с базой. Включите VPN и запустите ещё раз.");
    process.exit(1);
  }
  if (!response.ok) {
    console.log(`База ответила ошибкой ${response.status}: ${(await response.text()).slice(0, 200)}`);
    process.exit(1);
  }
  const existing = await response.json();
  const byTitle = new Map(existing.map((row) => [normalize(row.title), row]));

  let added = 0;
  let updated = 0;
  let failed = 0;
  for (const [index, dish] of DISHES.entries()) {
    const imageUrl = dish.photo ? `/menu/${dish.photo}.jpg` : null;
    if (imageUrl && !existsSync(`public${imageUrl}`)) {
      console.log(`✗ ${dish.title}: нет файла public${imageUrl}`);
      failed++;
      continue;
    }
    const found = byTitle.get(normalize(dish.title));
    if (found) {
      if (found.image_url || !imageUrl) {
        console.log(`· ${dish.title}: уже есть в меню — не трогаю`);
        continue;
      }
      const result = await fetch(`${rest}/menu_items?id=eq.${found.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ image_url: imageUrl, updated_at: new Date().toISOString() }),
      });
      if (result.ok) {
        console.log(`✓ ${dish.title}: добавил фото`);
        updated++;
      } else {
        console.log(`✗ ${dish.title}: ${result.status} ${(await result.text()).slice(0, 200)}`);
        failed++;
      }
      continue;
    }
    const result = await fetch(`${rest}/menu_items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        category: dish.category,
        title: dish.title,
        weight: dish.weight,
        description: null,
        price: dish.price,
        image_url: imageUrl,
        is_available: true,
        sort: index + 1,
      }),
    });
    if (result.ok) {
      console.log(`✓ ${dish.title}: добавил`);
      added++;
    } else {
      const text = await result.text();
      const hint = text.includes("menu_items_category_check")
        ? " — в базе нет разделов «Курица» и «Рыба»: примените supabase/schema.sql"
        : "";
      console.log(`✗ ${dish.title}: ${result.status}${hint || " " + text.slice(0, 200)}`);
      failed++;
    }
  }
  console.log(`\nГотово: новых ${added}, с новым фото ${updated}, ошибок ${failed}.`);
  console.log("Недостающие цены и вес впишите в админке → «Меню и цены». На сайте блюда появятся в течение минуты.");
}

main();
