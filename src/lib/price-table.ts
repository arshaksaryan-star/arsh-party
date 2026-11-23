/**
 * Таблица цен из Excel: CSV («;» или «,») или строки, вставленные из Excel (табуляция).
 * Первая строка — заголовки. Нужны «Название» (или id) и хотя бы один из столбцов «Цена», «Вес».
 * Пустая ячейка цены означает «цена уточняется»; столбца нет — поле не трогаем.
 */

export type PriceRow = { id: string | null; title: string; price?: number | null; weight?: string | null };

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/ё/g, "е").replace(/[«»"']/g, "").replace(/\s+/g, " ").trim();
}

function detectDelimiter(line: string): string {
  const counts = ["\t", ";", ","].map((delimiter) => [delimiter, line.split(delimiter).length] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 1 ? counts[0][0] : ";";
}

/** Разбор одной строки CSV с кавычками («"Шея, свинина"»). */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === delimiter) {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function column(headers: string[], names: string[]): number {
  return headers.findIndex((header) => names.some((name) => header === name || header.startsWith(name)));
}

export function parsePriceTable(text: string): { ok: true; rows: PriceRow[] } | { ok: false; message: string } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return { ok: false, message: "Нужна строка заголовков и хотя бы одно блюдо" };
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map((header) => header.toLowerCase());
  const idCol = column(headers, ["id"]);
  const titleCol = column(headers, ["название", "блюдо", "наименование", "позиция"]);
  const priceCol = column(headers, ["цена", "стоимость"]);
  const weightCol = column(headers, ["вес", "выход", "порция"]);
  if (titleCol < 0 && idCol < 0) return { ok: false, message: "Не нашли столбец «Название»" };
  if (priceCol < 0 && weightCol < 0) return { ok: false, message: "Не нашли столбцы «Цена» или «Вес»" };

  const rows: PriceRow[] = [];
  for (const [index, line] of lines.slice(1, 301).entries()) {
    const cells = splitLine(line, delimiter);
    const title = titleCol >= 0 ? cells[titleCol] ?? "" : "";
    const id = idCol >= 0 && /^[0-9a-f-]{36}$/.test(cells[idCol] ?? "") ? cells[idCol] : null;
    if (!title && !id) continue;
    const row: PriceRow = { id, title };
    if (priceCol >= 0) {
      const raw = (cells[priceCol] ?? "").replace(/[\s ₽руб.]/gi, "").replace(",", ".");
      if (raw === "") row.price = null;
      else {
        const price = Number(raw);
        if (!Number.isFinite(price) || price < 0 || price > 1_000_000) return { ok: false, message: `Строка ${index + 2}: непонятная цена «${cells[priceCol]}»` };
        row.price = Math.round(price);
      }
    }
    if (weightCol >= 0) row.weight = (cells[weightCol] ?? "").slice(0, 40) || null;
    rows.push(row);
  }
  if (rows.length === 0) return { ok: false, message: "В таблице нет блюд" };
  return { ok: true, rows };
}

/** Excel в России часто сохраняет CSV в кодировке Windows-1251 — распознаём обе. */
export async function readCsvFile(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1251").decode(bytes);
}

/** CSV для скачивания: открывается в Excel с русскими буквами (BOM) и разделителем «;». */
export function toPriceCsv(items: { id: string; category: string; title: string; weight: string | null; price: number | null }[], categoryLabel: (id: string) => string): string {
  const escape = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const lines = ["id;Раздел;Название;Вес;Цена"];
  for (const item of items) {
    lines.push([item.id, categoryLabel(item.category), item.title, item.weight ?? "", item.price === null ? "" : String(item.price)].map(escape).join(";"));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
