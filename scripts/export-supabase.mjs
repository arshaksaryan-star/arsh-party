/**
 * Выгрузка всех данных из Supabase перед переездом на свой сервер.
 * Запуск на Mac из папки arsh-party, С ВКЛЮЧЁННЫМ VPN:
 *   node scripts/export-supabase.mjs
 * Результат — папка migration/: db/*.json (таблицы) и files/ (фото меню, праздников, файлы отзывов).
 * Ссылки на фото внутри таблиц переписываются на адреса своего сервера (/files/media/…).
 * Ключи берутся из .env.local и на экран не выводятся.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const TABLES = ["content", "menu_items", "events", "site_reviews", "orders", "leads"];
const OUT = "migration";

function readEnv() {
  if (!existsSync(".env.local")) {
    console.log("Не нашёл .env.local. Запустите команду из папки arsh-party.");
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = readEnv();
const base = (env.SUPABASE_URL || "").replace(/\/+$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!base || !key) {
  console.log("В .env.local нет SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const headers = { apikey: key };
if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
const PUBLIC_PREFIX = `${base}/storage/v1/object/public/media/`;

async function get(url) {
  let response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  } catch {
    console.log("Нет связи с Supabase. Включите VPN и запустите ещё раз.");
    process.exit(1);
  }
  return response;
}

async function download(url, target) {
  const response = await get(url);
  if (!response.ok) {
    console.log(`  ✗ файл не скачался (${response.status}): ${target}`);
    return false;
  }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  return true;
}

/** Публичную ссылку Supabase на фото — скачать и заменить на адрес своего сервера. */
async function movePublic(url, stats) {
  if (typeof url !== "string" || !url.startsWith(PUBLIC_PREFIX)) return url;
  const objectPath = url.slice(PUBLIC_PREFIX.length).split("?")[0];
  if (await download(url, path.join(OUT, "files", "media", objectPath))) stats.files++;
  return `/files/media/${objectPath}`;
}

async function main() {
  mkdirSync(path.join(OUT, "db"), { recursive: true });
  const stats = { files: 0 };
  for (const table of TABLES) {
    const response = await get(`${base}/rest/v1/${table}?select=*`);
    if (!response.ok) {
      console.log(`✗ ${table}: ${response.status} ${(await response.text()).slice(0, 200)}`);
      process.exit(1);
    }
    const rows = await response.json();

    if (table === "menu_items") {
      for (const row of rows) row.image_url = await movePublic(row.image_url, stats);
    }
    if (table === "events") {
      for (const row of rows) {
        row.cover_url = await movePublic(row.cover_url, stats);
        if (Array.isArray(row.photos)) {
          const photos = [];
          for (const photo of row.photos) photos.push(await movePublic(photo, stats));
          row.photos = photos;
        }
      }
    }
    if (table === "site_reviews") {
      for (const row of rows) {
        for (const item of Array.isArray(row.media) ? row.media : []) {
          if (item && typeof item.path === "string") {
            const ok = await download(
              `${base}/storage/v1/object/review-uploads/${item.path}`,
              path.join(OUT, "files", "review-uploads", item.path),
            );
            if (ok) stats.files++;
          }
        }
      }
    }

    writeFileSync(path.join(OUT, "db", `${table}.json`), JSON.stringify(rows));
    console.log(`✓ ${table}: ${rows.length}`);
  }
  console.log(`✓ файлов скачано: ${stats.files}`);
  console.log("\nГотово. Данные в папке migration/. Дальше: ./deploy/import-data.sh (VPN можно выключить).");
}

main();
