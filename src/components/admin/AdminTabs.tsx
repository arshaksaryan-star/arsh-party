"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const TABS = [
  { href: "/admin/orders", label: "Заказы и заявки" },
  { href: "/admin/clients", label: "Клиенты" },
  { href: "/admin/certificates", label: "Сертификаты" },
  { href: "/admin/zvezda", label: "Тайная звезда" },
  { href: "/admin", label: "Контакты и тексты" },
  { href: "/admin/directions", label: "Направления" },
  { href: "/admin/menu", label: "Меню и цены" },
  { href: "/admin/events", label: "Праздники" },
  { href: "/admin/reviews", label: "Отзывы" },
  { href: "/admin/photos", label: "Фото Арша" },
  { href: "/kitchen", label: "Кухня" },
] as const;

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabs} aria-label="Разделы админки">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={(tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href)) ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
