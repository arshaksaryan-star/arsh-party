/**
 * Калькулятор праздника Arsh Party (владелец, 15.11.2026):
 * гостей × мяса на гостя (250–400 г) + гарнир (100–200 г) + соус и лаваш → готовая корзина мангала.
 * Считаем по меню на сегодня: только блюда с ценой и весом порции в граммах.
 */

export type CalcDish = { id: string; title: string; category: string; weight: string | null; price: number | null };

export const MEAT_CATEGORIES = ["shashlik", "chicken", "lulya", "fish"] as const;
export const MEAT_RANGE = { min: 250, max: 400, step: 25, start: 300 } as const;
export const SIDE_RANGE = { min: 100, max: 200, step: 25, start: 150 } as const;
export const GUESTS_RANGE = { min: 2, max: 200, start: 10 } as const;
/** Соус: одна баночка на двух гостей; лаваш: порция на гостя (стартовые значения, их можно поменять). */
export const SAUCE_GUESTS_PER_PORTION = 2;
export const LAVASH_PER_GUEST = 1;

/** «230 г» → 230; «1 порция» или пусто → null. */
export function gramsOf(weight: string | null): number | null {
  const match = weight?.match(/(\d+(?:[.,]\d+)?)\s*(кг|г)(?![а-яё])/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Math.round(match[2].toLowerCase() === "кг" ? value * 1000 : value);
}

export type CalcGroups = { meat: CalcDish[]; sides: CalcDish[]; sauces: CalcDish[]; lavash: CalcDish | null };

/** Что из меню годится для калькулятора. */
export function calcGroups(items: CalcDish[]): CalcGroups {
  const priced = items.filter((item) => item.price !== null);
  return {
    meat: priced.filter((item) => (MEAT_CATEGORIES as readonly string[]).includes(item.category) && gramsOf(item.weight)),
    sides: priced.filter((item) => item.category === "sides" && gramsOf(item.weight) && !/лаваш/i.test(item.title)),
    sauces: priced.filter((item) => item.category === "sauces"),
    lavash: priced.find((item) => /лаваш/i.test(item.title)) ?? null,
  };
}

export type CalcInput = {
  guests: number;
  meatGrams: number;
  meatIds: string[];
  /** Доли мяса в процентах по id (ползунки). Пусто — поровну. */
  meatShares?: Shares;
  sideGrams: number;
  sideIds: string[];
  sauce: boolean;
  sauceIds: string[];
  lavash: boolean;
};

export type CalcLine = { id: string; title: string; portions: number; grams: number | null; price: number; sum: number };
export type CalcResult = { lines: CalcLine[]; total: number; perGuest: number; meatTotalGrams: number; sideTotalGrams: number };

export type Shares = Record<string, number>;

/** Меньше 10% одного блюда не бывает: иначе ползунок обнуляет блюдо, которое гость сам выбрал. */
export const SHARE_MIN = 10;

/** Поровну: 3 блюда → 34 / 33 / 33. */
export function equalShares(ids: string[]): Shares {
  const out: Shares = {};
  if (ids.length === 0) return out;
  const base = Math.floor(100 / ids.length);
  let rest = 100 - base * ids.length;
  for (const id of ids) out[id] = base + (rest-- > 0 ? 1 : 0);
  return out;
}

/** Доли подходят к выбранным блюдам (те же id, сумма 100)? Иначе — поровну. */
export function sharesFor(ids: string[], shares: Shares | undefined): Shares {
  if (!shares) return equalShares(ids);
  const keys = Object.keys(shares);
  const sum = ids.reduce((total, id) => total + (shares[id] ?? 0), 0);
  if (keys.length !== ids.length || ids.some((id) => !(id in shares)) || sum !== 100) return equalShares(ids);
  return shares;
}

/**
 * Двигаем один ползунок — остальные подстраиваются, чтобы в сумме было 100%.
 * Остаток делится между другими блюдами пропорционально тому, что у них было, и каждому остаётся минимум SHARE_MIN.
 */
export function rebalanceShares(ids: string[], current: Shares, id: string, value: number): Shares {
  const base = sharesFor(ids, current);
  const others = ids.filter((other) => other !== id);
  if (others.length === 0) return { [id]: 100 };
  const own = Math.round(Math.min(100 - SHARE_MIN * others.length, Math.max(SHARE_MIN, value)));
  const free = 100 - own - SHARE_MIN * others.length;
  const weights = others.map((other) => Math.max(0, (base[other] ?? 0) - SHARE_MIN));
  const weightSum = weights.reduce((total, weight) => total + weight, 0);
  const raw = others.map((_, index) => (weightSum > 0 ? (free * weights[index]) / weightSum : free / others.length));
  const floors = raw.map(Math.floor);
  let rest = free - floors.reduce((total, part) => total + part, 0);
  // Остаток после округления — тем, у кого дробная часть больше.
  const order = raw.map((part, index) => ({ index, frac: part - floors[index] })).sort((a, b) => b.frac - a.frac);
  for (const { index } of order) if (rest-- > 0) floors[index] += 1;
  const out: Shares = { [id]: own };
  others.forEach((other, index) => (out[other] = SHARE_MIN + floors[index]));
  return out;
}

/** Делит граммы между выбранными блюдами (поровну или по долям) и округляет вверх до целых порций. */
function split(dishes: CalcDish[], totalGrams: number, shares?: Shares): CalcLine[] {
  if (dishes.length === 0 || totalGrams <= 0) return [];
  const parts = sharesFor(
    dishes.map((dish) => dish.id),
    shares,
  );
  return dishes.map((dish) => {
    const portionGrams = gramsOf(dish.weight) as number;
    const portions = Math.max(1, Math.ceil((totalGrams * parts[dish.id]) / 100 / portionGrams));
    const price = dish.price as number;
    return { id: dish.id, title: dish.title, portions, grams: portions * portionGrams, price, sum: portions * price };
  });
}

/** Делит штуки поровну между блюдами (соусы): остаток уходит первым по списку. */
function splitCount(dishes: CalcDish[], count: number): CalcLine[] {
  if (dishes.length === 0 || count <= 0) return [];
  const base = Math.floor(count / dishes.length);
  let rest = count - base * dishes.length;
  return dishes
    .map((dish) => {
      const portions = base + (rest-- > 0 ? 1 : 0);
      const price = dish.price as number;
      return { id: dish.id, title: dish.title, portions, grams: gramsOf(dish.weight) ? portions * (gramsOf(dish.weight) as number) : null, price, sum: portions * price };
    })
    .filter((line) => line.portions > 0);
}

export function calculate(groups: CalcGroups, input: CalcInput): CalcResult {
  const guests = Math.max(1, Math.round(input.guests));
  const pick = (list: CalcDish[], ids: string[]) => list.filter((dish) => ids.includes(dish.id));
  const meatTotalGrams = guests * input.meatGrams;
  const sideTotalGrams = guests * input.sideGrams;
  const lines = [
    ...split(pick(groups.meat, input.meatIds), meatTotalGrams, input.meatShares),
    ...split(pick(groups.sides, input.sideIds), sideTotalGrams),
    ...(input.sauce ? splitCount(pick(groups.sauces, input.sauceIds), Math.ceil(guests / SAUCE_GUESTS_PER_PORTION)) : []),
    ...(input.lavash && groups.lavash
      ? [{ id: groups.lavash.id, title: groups.lavash.title, portions: guests * LAVASH_PER_GUEST, grams: null, price: groups.lavash.price as number, sum: guests * LAVASH_PER_GUEST * (groups.lavash.price as number) }]
      : []),
  ];
  const total = lines.reduce((sum, line) => sum + line.sum, 0);
  return { lines, total, perGuest: Math.round(total / guests), meatTotalGrams, sideTotalGrams };
}
