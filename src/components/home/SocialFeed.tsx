import { getContent } from "@/lib/content";
import { fetchInstagramPosts, fetchTelegramPosts, fetchVkPosts, settle, type SocialNetwork, type SocialPost } from "@/lib/social";
import { CameraIcon, PlaneIcon, VkIcon } from "@/components/ui/icons";
import { Plate } from "@/components/ui/Plate";
import { SocialShuffle } from "./SocialShuffle";
import styles from "./SocialFeed.module.css";

type Channel = {
  network: SocialNetwork;
  name: string;
  url: string;
  role: string;
  cta: string;
  Icon: (props: { className?: string }) => React.JSX.Element;
  footnote?: boolean;
  posts: SocialPost[];
};

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" });

function PostCard({ post }: { post: SocialPost }) {
  return (
    <li>
      <a href={post.url} target="_blank" rel="noopener noreferrer" className={styles.post}>
        {post.image ? (
          <span className={styles.postImage}>
            {/* Внешние картинки соцсетей: обычный img, без оптимизации Next */}
            <img src={post.image} alt="" loading="lazy" decoding="async" />
          </span>
        ) : null}
        {post.text ? <span className={styles.postText}>{post.text}</span> : null}
        <time className={styles.postDate} dateTime={post.date}>
          {dateFormat.format(new Date(post.date))}
        </time>
      </a>
    </li>
  );
}

type SocialFeedProps = {
  /** Какие соцсети показать. По умолчанию все подключённые. */
  networks?: ("vk" | "instagram" | "telegram")[];
  /** Подпись под ником. */
  sub?: string;
};

export async function SocialFeed({
  networks = ["vk", "instagram", "telegram"],
  sub = "Один ник во всех соцсетях. Свежие праздники, закулисье и розыгрыши.",
}: SocialFeedProps = {}) {
  const { site: content } = await getContent();
  // Сети, которые не нужны на этой странице, выключаем так же, как пустую ссылку.
  const site = {
    ...content,
    vkUrl: networks.includes("vk") ? content.vkUrl : null,
    instagramUrl: networks.includes("instagram") ? content.instagramUrl : null,
    telegramChannel: networks.includes("telegram") ? content.telegramChannel : null,
  };
  const handle = site.socialHandle;
  const [vkPosts, instagramPosts, telegramPosts] = await Promise.all([
    site.vkUrl ? settle(() => fetchVkPosts(handle), "VK") : Promise.resolve([]),
    site.instagramUrl ? settle(fetchInstagramPosts, "Instagram") : Promise.resolve([]),
    site.telegramChannel ? settle(() => fetchTelegramPosts(site.telegramChannel as string), "Telegram") : Promise.resolve([]),
  ]);

  const channels: Channel[] = [];
  if (site.vkUrl) {
    channels.push({ network: "vk", name: "ВКонтакте", url: site.vkUrl, role: "Новости, розыгрыши, фото с праздников", cta: "Подписаться", Icon: VkIcon, posts: vkPosts });
  }
  if (site.instagramUrl) {
    channels.push({ network: "instagram", name: "Instagram", url: site.instagramUrl, role: "Атмосфера событий в кадрах", cta: "Смотреть", Icon: CameraIcon, footnote: true, posts: instagramPosts });
  }
  if (site.telegramChannel) {
    channels.push({ network: "telegram", name: "Telegram", url: `https://t.me/${site.telegramChannel}`, role: "Закулисье и мысли Арша", cta: "Читать канал", Icon: PlaneIcon, posts: telegramPosts });
  }
  if (channels.length === 0) return null;

  return (
    <section className={`container ${styles.section}`} aria-labelledby="social-title" id="social">
      <div className={styles.head}>
        <h2 id="social-title" className={styles.heading}>
          <Plate className={styles.handle}>@{handle}</Plate>
        </h2>
        <p className={styles.sub}>{sub}</p>
      </div>

      <SocialShuffle count={channels.length}>
        {channels.map(({ network, name, url, role, cta, Icon, footnote, posts }) => (
          <article key={network} className={styles.channel} data-network={network}>
            <a href={url} target="_blank" rel="noopener noreferrer" className={styles.profile}>
              <span className={styles.icon}>
                <Icon />
              </span>
              <span className={styles.profileText}>
                <span className={styles.name}>
                  {name}
                  {footnote ? <sup>*</sup> : null}
                </span>
                <span className={styles.at}>@{handle}</span>
              </span>
              <span className={styles.cta}>{cta}</span>
            </a>

            {posts.length > 0 ? (
              <ul className={styles.posts}>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </ul>
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" className={styles.placeholder}>
                <span className={styles.placeholderHandle}>@{handle}</span>
                <span className={styles.placeholderRole}>{role}</span>
              </a>
            )}
          </article>
        ))}
      </SocialShuffle>

      {channels.some((channel) => channel.footnote) ? (
        <p className={styles.footnote}>
          * Instagram принадлежит компании Meta, признанной экстремистской организацией и запрещённой в России.
        </p>
      ) : null}
    </section>
  );
}
