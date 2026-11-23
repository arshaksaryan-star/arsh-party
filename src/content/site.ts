/**
 * Общие данные бренда и контакты — значения по умолчанию.
 * Владелец меняет их в админке (/admin), правки хранятся в Supabase
 * и накладываются поверх этих значений (см. src/lib/content.ts).
 * Пустые поля (null) на сайте не показываются.
 */

export type SiteConfig = {
  name: string;
  slogan: string;
  description: string;
  city: string;
  /** Городской номер — главный для звонков. */
  phone: string | null;
  /** Мобильный, к нему привязаны WhatsApp и Telegram. */
  mobile: string | null;
  whatsappUrl: string | null;
  telegramUrl: string | null;
  instagramUrl: string | null;
  vkUrl: string | null;
  /** Общее имя аккаунтов в соцсетях. */
  socialHandle: string;
  /** Имя публичного Telegram-канала без @ — для ленты постов. null, если канала нет. */
  telegramChannel: string | null;
  /** Регион работы для текстов и SEO. */
  region: string;
  /** Подзаголовок под логотипом на главной. */
  heroLead: string;
  /** Ссылки на страницу отзывов /otziv. null — кнопки площадки нет. */
  reviewYandexUrl: string | null;
  review2gisUrl: string | null;
  reviewVkUrl: string | null;
  reviewAvitoUrl: string | null;
  /** Arsh Live: личный Telegram-канал Арша и видео-кружок с приветствием на главной. */
  liveChannelUrl: string | null;
  liveText: string | null;
  /** Заказ с мангала: минимальная сумма блюд и цена доставки, рубли (строкой — так их хранит админка). */
  orderMinSum: string | null;
  deliveryNearPrice: string | null;
  deliveryFarPrice: string | null;
  /** Реквизиты оператора персональных данных для /privacy, /soglasie, /rassylka. */
  legalName: string | null;
  legalInn: string | null;
  legalOgrnip: string | null;
  legalAddress: string | null;
  legalEmail: string | null;
  /** Адрес сайта для документов, например arshparty.ru. */
  siteUrl: string | null;
  /** Фраза под логотипом в подвале. null — строки нет. */
  footerTagline: string | null;
  /** Адрес для самовывоза. */
  address: string | null;
  hours: string | null;
};

export const defaultSite: SiteConfig = {
  name: "Arsh Party",
  slogan: "All ready for super holidays!",
  description:
    "Arsh Party — всё для праздника в Рязани и по всему ЦФО: доставка блюд с мангала, скорая шашлычная помощь, событийный кейтеринг, организация мероприятий и ведущий.",
  city: "Рязань",
  phone: "+7 (4912) 99-00-95",
  mobile: "+7 (905) 185-00-03",
  whatsappUrl: "https://wa.me/79051850003",
  // Открывает чат по номеру телефона, если в настройках Telegram номер не скрыт.
  telegramUrl: "https://t.me/+79051850003",
  instagramUrl: "https://instagram.com/arshparty",
  vkUrl: "https://vk.com/arshparty",
  socialHandle: "arshparty",
  // Канал Арша — отдельным блоком Arsh Live, не в ленте соцсетей (владелец, 14.11.2026).
  telegramChannel: "arshlive",
  liveChannelUrl: "https://t.me/arshlive",
  liveText: "Привет! Я Арш. Здесь — закулисье праздников, мысли и предложения, которых нет на сайте.",
  region: "Рязань и весь Центральный федеральный округ",
  heroLead: "Всё для праздника в Рязани и по всему ЦФО. Пять направлений, пять звёзд — выберите свою.",
  footerTagline: "Пока вы смотрите — другие едят!",
  reviewYandexUrl: "https://yandex.ru/maps/org/arsh_pati/13512200739/reviews/",
  review2gisUrl: "https://2gis.ru/ryazan/firm/70000001035230811/tab/reviews",
  reviewVkUrl: "https://vk.com/arshparty",
  // Ссылку на профиль Авито владелец вписывает в админке.
  reviewAvitoUrl: null,
  // Условия заказа (владелец, 12.11.2026): минималка 3000 ₽, доставка 300 ₽ до 3 км и 600 ₽ дальше, за город — по договорённости.
  orderMinSum: "3000",
  deliveryNearPrice: "300",
  deliveryFarPrice: "600",
  // Реквизиты для документов (владелец, 12.11.2026). Меняются в админке → «Реквизиты для документов».
  legalName: "Сарян Аршак Гарикович",
  // Из выписки ЕГРИП (прислал владелец 12.11.2026); контрольные цифры сверены.
  legalInn: "622906549353",
  legalOgrnip: "320623400033682",
  legalAddress: "г. Рязань",
  legalEmail: "arshlive@vk.com",
  siteUrl: "arshparty.ru",
  // Адрес и часы — из официального ответа Arsh Party в 2ГИС от 14.03.2026.
  address: "ул. Карла Маркса, 1/6",
  hours: "Без выходных, доставка с 11:00 до 23:00",
};

/** Ссылка для набора номера: оставляет только цифры и плюс. */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Поля, которые владелец может менять в админке. */
export type EditableSiteField = {
  key: Exclude<keyof SiteConfig, "name" | "slogan" | "city" | "socialHandle">;
  label: string;
  hint?: string;
  kind: "text" | "textarea" | "url" | "tel";
};

export const EDITABLE_SITE_FIELDS: readonly EditableSiteField[] = [
  { key: "heroLead", label: "Подзаголовок на главной", kind: "textarea" },
  { key: "footerTagline", label: "Фраза под логотипом в подвале", kind: "text", hint: "Пусто — строки не будет" },
  { key: "phone", label: "Городской телефон", kind: "tel", hint: "Главный номер: кнопка «Позвонить», шапка, подвал" },
  { key: "mobile", label: "Мобильный (WhatsApp и Telegram)", kind: "tel" },
  { key: "whatsappUrl", label: "Ссылка WhatsApp", kind: "url", hint: "Вида https://wa.me/79001234567" },
  { key: "telegramUrl", label: "Ссылка Telegram для связи", kind: "url", hint: "Вида https://t.me/+79001234567 или https://t.me/имя" },
  { key: "vkUrl", label: "ВКонтакте", kind: "url" },
  { key: "instagramUrl", label: "Instagram", kind: "url" },
  { key: "telegramChannel", label: "Telegram-канал для ленты постов", kind: "text", hint: "Только имя, без @. Пусто — колонки Telegram нет" },
  { key: "liveChannelUrl", label: "Arsh Live — ссылка на канал", kind: "url", hint: "Кнопка «Подписаться» в блоке с кружочком. Пусто — блока нет" },
  { key: "liveText", label: "Arsh Live — текст рядом с кружочком", kind: "textarea" },
  { key: "reviewYandexUrl", label: "Яндекс Карты — отзывы", kind: "url", hint: "Кнопка на странице /otziv. Пусто — кнопки нет" },
  { key: "review2gisUrl", label: "2ГИС — отзывы", kind: "url" },
  { key: "reviewVkUrl", label: "ВКонтакте — отзывы", kind: "url" },
  { key: "reviewAvitoUrl", label: "Авито — отзывы", kind: "url", hint: "Ссылка на ваш профиль на Авито" },
  { key: "orderMinSum", label: "Минимальная сумма заказа, ₽", kind: "text", hint: "Сумма блюд без доставки. Пусто — без минимума" },
  { key: "deliveryNearPrice", label: "Доставка до 3 км, ₽", kind: "text", hint: "От адреса самовывоза" },
  { key: "deliveryFarPrice", label: "Доставка дальше 3 км по городу, ₽", kind: "text", hint: "За город — всегда по договорённости" },
  { key: "legalName", label: "ИП: фамилия, имя, отчество", kind: "text", hint: "Как в выписке ЕГРИП. Подставляется в политику и согласия" },
  { key: "legalInn", label: "ИНН", kind: "text" },
  { key: "legalOgrnip", label: "ОГРНИП", kind: "text" },
  { key: "legalAddress", label: "Адрес ИП", kind: "text", hint: "Для раздела «Реквизиты» в политике" },
  { key: "legalEmail", label: "E-mail для обращений по персональным данным", kind: "text" },
  { key: "siteUrl", label: "Адрес сайта", kind: "text", hint: "Например, arshparty.ru" },
  { key: "address", label: "Адрес самовывоза", kind: "text" },
  { key: "hours", label: "Часы работы", kind: "text" },
  { key: "region", label: "Регион работы", kind: "text", hint: "Показывается в подвале" },
  { key: "description", label: "Описание для поисковиков", kind: "textarea", hint: "До 160 символов, видно в выдаче Яндекса и Google" },
];
