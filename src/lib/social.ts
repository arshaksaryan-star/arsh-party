/**
 * Свежие посты из соцсетей для блока «@arshparty».
 * Только сервер. Каждая лента включается своей переменной окружения;
 * без ключа лента не запрашивается, а блок показывает карточку профиля.
 *
 * - ВКонтакте: метод API wall.get, нужен сервисный ключ приложения VK (VK_SERVICE_TOKEN).
 * - Instagram: Instagram API, метод /me/media, нужен токен доступа (INSTAGRAM_ACCESS_TOKEN).
 *   Долгоживущий токен действует 60 дней, его нужно продлевать (см. README).
 * - Telegram: публичная веб-версия канала t.me/s/<канал>, ключ не нужен,
 *   достаточно указать канал в content/site.ts (telegramChannel).
 *
 * Результаты кэшируются на 15 минут, поэтому соцсети не дёргаются на каждый визит.
 */

export type SocialNetwork = "vk" | "instagram" | "telegram";

export type SocialPost = {
  id: string;
  network: SocialNetwork;
  url: string;
  text: string;
  image: string | null;
  /** ISO-дата публикации. */
  date: string;
};

const REVALIDATE_SECONDS = 900;
const POSTS_PER_NETWORK = 3;

/* ───────────── ВКонтакте ───────────── */

type VkPhotoSize = { url: string; width: number; height: number };
type VkAttachment =
  | { type: "photo"; photo: { sizes: VkPhotoSize[] } }
  | { type: "video"; video: { image?: VkPhotoSize[] } }
  | { type: string };
type VkWallItem = {
  id: number;
  owner_id: number;
  date: number;
  text: string;
  attachments?: VkAttachment[];
  copy_history?: { text: string; attachments?: VkAttachment[] }[];
};

function largest(sizes: VkPhotoSize[] | undefined): string | null {
  if (!sizes || sizes.length === 0) return null;
  return [...sizes].sort((a, b) => b.width - a.width)[0].url;
}

function vkImage(attachments: VkAttachment[] | undefined): string | null {
  for (const attachment of attachments ?? []) {
    if (attachment.type === "photo" && "photo" in attachment) return largest(attachment.photo.sizes);
    if (attachment.type === "video" && "video" in attachment) return largest(attachment.video.image);
  }
  return null;
}

export async function fetchVkPosts(domain: string): Promise<SocialPost[]> {
  const token = process.env.VK_SERVICE_TOKEN;
  if (!token) return [];

  const params = new URLSearchParams({
    domain,
    count: "10",
    filter: "owner",
    v: "5.199",
    access_token: token,
  });
  const response = await fetch(`https://api.vk.com/method/wall.get?${params}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  const data = (await response.json()) as { response?: { items: VkWallItem[] }; error?: { error_msg: string } };
  if (data.error || !data.response) throw new Error(`VK: ${data.error?.error_msg ?? response.status}`);

  return data.response.items
    .map((item): SocialPost => {
      const repost = item.copy_history?.[0];
      return {
        id: `vk-${item.owner_id}_${item.id}`,
        network: "vk",
        url: `https://vk.com/wall${item.owner_id}_${item.id}`,
        text: (item.text || repost?.text || "").trim(),
        image: vkImage(item.attachments) ?? vkImage(repost?.attachments),
        date: new Date(item.date * 1000).toISOString(),
      };
    })
    .filter((post) => post.text || post.image)
    .slice(0, POSTS_PER_NETWORK);
}

/* ───────────── Instagram ───────────── */

type InstagramMedia = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
};

export async function fetchInstagramPosts(): Promise<SocialPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  const params = new URLSearchParams({
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    limit: String(POSTS_PER_NETWORK),
    access_token: token,
  });
  const response = await fetch(`https://graph.instagram.com/me/media?${params}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  const data = (await response.json()) as { data?: InstagramMedia[]; error?: { message: string } };
  if (data.error || !data.data) throw new Error(`Instagram: ${data.error?.message ?? response.status}`);

  return data.data.map((media) => ({
    id: `ig-${media.id}`,
    network: "instagram",
    url: media.permalink,
    text: (media.caption ?? "").trim(),
    image: media.media_type === "VIDEO" ? (media.thumbnail_url ?? null) : (media.media_url ?? null),
    date: media.timestamp,
  }));
}

/* ───────────── Telegram ───────────── */

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim();
}

/**
 * Разбирает публичную страницу канала t.me/s/<канал>.
 * Это HTML, а не API: если Telegram поменяет вёрстку, лента станет пустой,
 * а блок покажет карточку канала — сайт не сломается.
 */
/**
 * Из России t.me с сервера недоступен: страницу канала и картинки берём через посредника
 * (тот же Cloudflare Worker, что и для уведомлений, TELEGRAM_API_BASE), картинки отдаём
 * посетителям со своего сервера через /api/social-image.
 */
function telegramProxy(): string | null {
  const base = process.env.TELEGRAM_API_BASE;
  return base ? base.replace(/\/+$/, "") : null;
}

function telegramImage(url: string | null): string | null {
  if (!url) return null;
  return telegramProxy() ? `/api/social-image?u=${encodeURIComponent(url)}` : url;
}

export async function fetchTelegramPosts(channel: string): Promise<SocialPost[]> {
  const response = await fetch(`${telegramProxy() ?? "https://t.me"}/s/${encodeURIComponent(channel)}`, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`Telegram: ${response.status}`);
  const html = await response.text();

  const blocks = html.split('class="tgme_widget_message_wrap').slice(1);
  const posts = blocks
    .map((block): SocialPost | null => {
      // «Канал создан», «Фото канала обновлено» и прочие служебные записи пропускаем.
      if (block.includes("service_message")) return null;
      const post = block.match(/data-post="([^"]+)"/)?.[1];
      const date = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
      if (!post || !date) return null;
      const textHtml = block.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
      const image =
        block.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/)?.[1] ??
        block.match(/tgme_widget_message_video_thumb[^>]*background-image:url\('([^']+)'\)/)?.[1] ??
        null;
      return {
        id: `tg-${post}`,
        network: "telegram",
        url: `https://t.me/${post}`,
        text: htmlToText(textHtml),
        image: telegramImage(image),
        date,
      };
    })
    .filter((post): post is SocialPost => post !== null && Boolean(post.text || post.image));

  // На странице посты идут от старых к новым.
  return posts.reverse().slice(0, POSTS_PER_NETWORK);
}

/** Безопасный запуск: ошибка одной соцсети не роняет весь блок. */
export async function settle(load: () => Promise<SocialPost[]>, label: string): Promise<SocialPost[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`[social] ${label}:`, error);
    return [];
  }
}
