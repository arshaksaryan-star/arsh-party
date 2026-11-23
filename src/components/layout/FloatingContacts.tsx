"use client";

import { useEffect, useState } from "react";
import { useContent } from "@/components/content/ContentProvider";
import { phoneHref } from "@/content/site";
import { ChatIcon, PhoneIcon, PlaneIcon } from "@/components/ui/icons";
import styles from "./FloatingContacts.module.css";

/**
 * Кнопки связи в правом нижнем углу — в зоне большого пальца на телефоне.
 * Пока на экране форма заявки, кнопки уезжают, чтобы не закрывать поля.
 */
export function FloatingContacts() {
  const { site } = useContent();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const form = document.getElementById("order");
    if (!form) return;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), {
      rootMargin: "0px 0px -15% 0px",
    });
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  const items = [
    site.whatsappUrl ? { href: site.whatsappUrl, label: "Написать в WhatsApp", Icon: ChatIcon, external: true } : null,
    site.telegramUrl ? { href: site.telegramUrl, label: "Написать в Telegram", Icon: PlaneIcon, external: true } : null,
    site.phone ? { href: phoneHref(site.phone), label: `Позвонить ${site.phone}`, Icon: PhoneIcon, external: false } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return null;

  return (
    <nav className={`${styles.dock} ${hidden ? styles.away : ""}`} aria-label="Быстрая связь" aria-hidden={hidden || undefined}>
      {items.map(({ href, label, Icon, external }, index) => (
        <a
          key={href}
          href={href}
          className={`${styles.button} ${index === items.length - 1 ? styles.main : ""}`}
          aria-label={label}
          title={label}
          style={{ animationDelay: `${0.4 + index * 0.08}s` }}
          tabIndex={hidden ? -1 : undefined}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          <Icon className={styles.icon} />
        </a>
      ))}
    </nav>
  );
}
