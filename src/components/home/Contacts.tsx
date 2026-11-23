import { phoneHref, type SiteConfig } from "@/content/site";
import { getContent } from "@/lib/content";
import { ChatIcon, PhoneIcon, PinIcon, PlaneIcon } from "@/components/ui/icons";
import styles from "./Contacts.module.css";

type Channel = {
  id: string;
  href: string;
  name: string;
  value: string;
  role: string;
  Icon: (props: { className?: string }) => React.JSX.Element;
  external: boolean;
};

/** Собирает заполненные каналы связи из content/site.ts. Соцсети — в отдельном блоке SocialFeed. */
function getChannels(site: SiteConfig): Channel[] {
  const channels: Channel[] = [];
  if (site.phone) {
    channels.push({ id: "phone", href: phoneHref(site.phone), name: "Позвонить", value: site.phone, role: "Заказ и вопросы голосом", Icon: PhoneIcon, external: false });
  }
  if (site.whatsappUrl && site.mobile) {
    channels.push({ id: "whatsapp", href: site.whatsappUrl, name: "WhatsApp", value: site.mobile, role: "Быстрый заказ в переписке", Icon: ChatIcon, external: true });
  }
  if (site.telegramUrl && site.mobile) {
    channels.push({ id: "telegram", href: site.telegramUrl, name: "Telegram", value: site.mobile, role: "Заказ, фото меню, договорённости", Icon: PlaneIcon, external: true });
  }
  return channels;
}

export async function Contacts() {
  const { site } = await getContent();
  const channels = getChannels(site);
  if (channels.length === 0) return null;

  return (
    <section className={`container ${styles.section}`} aria-labelledby="contacts-title" id="contact">
      <div className={styles.head}>
        <h2 id="contacts-title" className={styles.heading}>
          Связаться
        </h2>
        {site.address ? (
          <p className={styles.address}>
            <PinIcon className={styles.pin} />
            <span>
              {site.city}, {site.address}
              {site.hours ? <span className={styles.hours}>{site.hours}</span> : null}
            </span>
          </p>
        ) : null}
      </div>

      <ul className={styles.grid}>
        {channels.map(({ id, href, name, value, role, Icon, external }) => (
          <li key={id}>
            <a
              href={href}
              className={styles.card}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <span className={styles.icon}>
                <Icon />
              </span>
              <span className={styles.name}>{name}</span>
              <span className={styles.value}>{value}</span>
              <span className={styles.role}>{role}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
