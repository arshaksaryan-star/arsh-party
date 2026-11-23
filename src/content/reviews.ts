/**
 * Отзывы клиентов Arsh Party с картографических площадок.
 *
 * Тексты перенесены дословно, с авторской орфографией и эмодзи.
 * Сверено с площадками 29.10.2026. Новые площадки добавляются
 * в `reviewPlatforms`, новые отзывы — в `reviews`.
 */

import type { DirectionSlug } from "./directions";

export type ReviewPlatformId = "yandex" | "2gis";

export type ReviewPlatform = {
  id: ReviewPlatformId;
  name: string;
  /** Средняя оценка на площадке. */
  rating: number;
  /** Подпись к числу оценок, как на площадке. */
  ratingsLabel: string;
  url: string;
};

export type Review = {
  /** Номер отзыва для правки в админке (у отзывов с площадок). */
  id?: string;
  author: string;
  /** Дата публикации в формате ГГГГ-ММ-ДД. */
  date: string;
  /** «site» — отзыв оставлен на нашем сайте и прошёл модерацию в админке. */
  platform: ReviewPlatformId | "site";
  /** Оценка, если площадка её показывает. */
  rating: number | null;
  text: string;
  /** О каких направлениях отзыв — для страниц пяти звёзд. */
  directions?: DirectionSlug[];
  /** Фото и видео к отзыву с сайта (временные ссылки). */
  media?: { kind: "image" | "video"; url: string }[];
};

export const reviewsCheckedAt = "2026-10-29";

export const reviewPlatforms: readonly ReviewPlatform[] = [
  {
    id: "yandex",
    name: "Яндекс Карты",
    rating: 4.8,
    ratingsLabel: "54 оценки",
    url: "https://yandex.ru/maps/org/arsh_pati/13512200739/reviews/",
  },
  {
    id: "2gis",
    name: "2ГИС",
    rating: 4.6,
    ratingsLabel: "27 оценок",
    url: "https://2gis.ru/ryazan/firm/70000001035230811/tab/reviews",
  },
];

export const reviews: readonly Review[] = [
  {
    author: "Оксана С.",
    directions: ["catering"],
    date: "2026-09-09",
    platform: "yandex",
    rating: 5,
    text: "Уже 3 раз заказывали еду на выездной корпоратив на 100 человек в Касимовский район. Еда очень вкусная, доставка во время, всё было на высшем уровне. Огромное спасибо за сотрудничество!!!!",
  },
  {
    author: "Алёна",
    directions: ["catering", "events"],
    date: "2026-07-13",
    platform: "yandex",
    rating: 5,
    text: "Заказывали кейтеринг на свадьбу в Солотчу.\nОбсудили все детали подробно, приехали вовремя, расставили всё и пожарили шашлык оперативно.\nВсе салаты, закуски, нарезки были свежими и очень вкусными, особенно фруктовая тарелка.\nНО особого внимания заслуживает шашлык. Ни мы, ни гости такого вкусного ещё никогда не ели до этого дня.\nОгромного спасибо Аршу и его команде!",
  },
  {
    author: "Софья Минкина",
    directions: ["events", "sshp"],
    date: "2026-07-13",
    platform: "yandex",
    rating: 5,
    text: "Спасибо большое команде ребят Арш Пати, помогли организовать выпускной для девятиклассников и их родителей! Накормили всех очень вкусным шашлыком и пловом. Помогли организовать для всех досуг. Рекомендую 😊 не пожалеете.",
  },
  {
    author: "Виктория К.",
    directions: ["catering", "events"],
    date: "2026-07-04",
    platform: "yandex",
    rating: 5,
    text: "Заказывали кейтеринг на мероприятие, все было просто изумительно. Все приехало во время, фуршету отдельный лайк, это было очень вкусно, красиво и разнообразно. Банкетный стол ломился от еды, все скушать не смогли, настолько сытно и аппетитно это было, Аршак все помог оформить, украсить и зарядить настроением 🥰🥰🥰🥰",
  },
  {
    author: "Ekaterina Smagina",
    directions: ["sshp"],
    date: "2026-05-23",
    platform: "2gis",
    rating: null,
    text: "Вчера отмечали детский праздник и решили пригласить Arsh party для организации шашлыка для родителей. Это было одно из лучших решений! Всё прошло просто идеально: сотрудники прибыли вовремя, быстро всё подготовили. Шашлык получился невероятно вкусным — сочным, ароматным и приготовленным именно так, как любят настоящие ценители мяса и рыбы. Видно, что используются качественные продукты и профессиональное оборудование. Особенно понравилось, что сотрудники были очень внимательны к деталям, следили за чистотой и всегда оставались доброжелательными. Благодаря такой организации родители смогли полноценно отдохнуть и насладиться праздником вместе с детьми. Гости остались в полном восторге, а многие ещё долго обсуждали, какой вкусный был шашлык. Спасибо за высокий уровень сервиса и прекрасную атмосферу!",
  },
  {
    author: "Юлия Е.",
    directions: ["mangal"],
    date: "2026-01-16",
    platform: "yandex",
    rating: 5,
    text: "Невероятно вкусный шашлык, шея, как отдельный вид искусства. Мы и все наши гости оценили. Теперь, если вкусно поесть, то только здесь.Смело заказывайте, не пожалеете.",
  },
  {
    author: "Аделина Султанова",
    directions: ["catering"],
    date: "2025-10-03",
    platform: "2gis",
    rating: null,
    text: "Замечательная команда!\nОрганизовали отличный кофе-брейк, помогли с выбором позиций, часть ответственности даже взяли на себя, чем очень облегчили нашу подготовку к мероприятию 😅\nКоммуникация была легкой и оперативной, сделали все вкусно, качественно и быстро, спасибо за такой сервис! 🙏🏼",
  },
  {
    author: "Нвер Сазонов",
    directions: ["catering", "sshp"],
    date: "2025-09-29",
    platform: "2gis",
    rating: null,
    text: "Команда большие молодцы! Спасли нас с горящим мероприятием, за очень короткий срок закрыли все наши пожелания! Всё красиво и вкусно. Однозначно рекомендую!",
  },
  {
    author: "Анастасия Одинцова",
    directions: ["catering"],
    date: "2025-09-02",
    platform: "2gis",
    rating: null,
    text: "Заказали банкет на юбилей. Сервис отличный, меню Аршак составил очень вкусное и сытное под наши предпочтения. Банкетный менеджер и официанты большие умнички. Мы в восторге.",
  },
  {
    author: "Анна П.",
    directions: ["mangal"],
    date: "2025-08-27",
    platform: "yandex",
    rating: 5,
    text: "Увидела Arsh Party совершенно случайно, не знакома лично. Заказывала шашлык на ДР мужу. Мы много где пробовали шашлык, и сказать честно, на все 100% не нравится нигде в нашем городе, а вот у Арша понравилось на 100000000%!!!! Мы заказывали шашлык из свиной шеи, куриных голеней и куриных ножек. Нежнее куриной грудки нет нигде в мире!!! Куриные голени у нас даже попросили гости с собой, не удержались!!! Свиная шея - произведение искусства!!! Порции огромные, я немного переборщила с количеством, но зато все гости ушли с гостинцами довольные !!! Хочу заметить важный момент- на следующий день мы просто погрели шашлык и он остается таким же вкусным, сочным и нежным!!!! Ещё мы заказывали грибы гриль, соусы и лаваш!!! Лаваш очень тонкий и вкусный!!! И особое спасибо Аршу лично за качественный сервис!!! Вы повар от Бога!!!",
  },
  {
    author: "Галя Киселева",
    directions: ["mangal"],
    date: "2025-01-31",
    platform: "yandex",
    rating: 5,
    text: "Замечательный шашлык из шеи, карбонада, куриный, люля-кебаб. Обалденные грибочки и запечённые овощи!А какой салат с креветками!!!! Самое вкусное место в Рязани Приезжаем из Подмосковья и всегда заказываем шашлык и салаты только у Аршака. Мясо всегда самое самое!!! Жаль, что узнала об этом месте только год назад.",
  },
];

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** «2026-07-13» → «13 июля 2026». */
export function formatReviewDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function getPlatform(id: ReviewPlatformId, list: readonly ReviewPlatform[] = reviewPlatforms): ReviewPlatform {
  const platform = list.find((item) => item.id === id) ?? reviewPlatforms.find((item) => item.id === id);
  if (!platform) throw new Error(`Неизвестная площадка отзывов: ${id}`);
  return platform;
}

/** Отзывы о конкретном направлении, свежие первыми. */
export function reviewsForDirection(slug: DirectionSlug, limit = 3, list: readonly Review[] = reviews): Review[] {
  return list
    .filter((review) => review.directions?.includes(slug))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/* ───────────── Правки из админки (content key = "reviews") ───────────── */

export type ReviewsContent = { platforms: ReviewPlatform[]; items: Review[] };

const DIRECTION_SLUGS: readonly DirectionSlug[] = ["mangal", "sshp", "catering", "events", "host"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Отзывы с площадок по умолчанию с номерами — чтобы их можно было править в админке. */
export function defaultReviewItems(): Review[] {
  return reviews.map((review, index) => ({ ...review, id: `r${index + 1}` }));
}

/** Площадки: оценка и подпись из админки поверх значений по умолчанию. Отзывы: список из админки или из кода. */
export function parseReviewsContent(data: unknown): ReviewsContent {
  const platforms = reviewPlatforms.map((platform) => {
    const patch = isRecord(data) && isRecord(data.platforms) ? data.platforms[platform.id] : undefined;
    if (!isRecord(patch)) return { ...platform };
    const rating = Number(patch.rating);
    return {
      ...platform,
      rating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? Math.round(rating * 10) / 10 : platform.rating,
      ratingsLabel: typeof patch.ratingsLabel === "string" && patch.ratingsLabel.trim() ? patch.ratingsLabel.trim().slice(0, 40) : platform.ratingsLabel,
    };
  });
  if (!isRecord(data) || !Array.isArray(data.items)) return { platforms, items: defaultReviewItems() };
  const items: Review[] = [];
  for (const raw of data.items.slice(0, 200)) {
    if (!isRecord(raw)) continue;
    const author = typeof raw.author === "string" ? raw.author.trim().slice(0, 80) : "";
    const text = typeof raw.text === "string" ? raw.text.trim().slice(0, 2000) : "";
    const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : "";
    const platform = raw.platform === "2gis" ? "2gis" : raw.platform === "yandex" ? "yandex" : null;
    if (!author || !text || !date || !platform || raw.hidden === true) continue;
    const rating = Number(raw.rating);
    items.push({
      id: typeof raw.id === "string" ? raw.id : undefined,
      author,
      text,
      date,
      platform,
      rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
      directions: Array.isArray(raw.directions) ? DIRECTION_SLUGS.filter((slug) => (raw.directions as unknown[]).includes(slug)) : [],
    });
  }
  return { platforms, items };
}
