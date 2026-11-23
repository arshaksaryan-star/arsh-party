"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./SectionNav.module.css";

/** href — отдельная страница вместо блока главной. */
type Section = { id: string; label: string; href?: string };

/**
 * Ссылки на блоки главной. Подсвечивает блок, который сейчас на экране.
 * На телефоне — горизонтальная лента под логотипом, активный пункт сам доезжает в поле зрения.
 */
export function SectionNav({ sections, className }: { sections: readonly Section[]; className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Лента прокручена от начала — включаем затухание слева.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onScroll = () => setScrolled(list.scrollLeft > 4);
    onScroll();
    list.addEventListener("scroll", onScroll, { passive: true });
    return () => list.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    // Активен блок, который пересекает полосу чуть выше середины экрана.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    elements.forEach((element) => observer.observe(element));

    // Над первым блоком (hero) ничего не подсвечиваем.
    const onScroll = () => {
      if (elements[0].getBoundingClientRect().top > window.innerHeight * 0.4) setActive(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [sections]);

  // В горизонтальной ленте прокручиваем активный пункт в видимую часть, не двигая страницу.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !active) return;
    const item = list.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!item || list.scrollWidth <= list.clientWidth) return;
    const left = item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2;
    list.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  return (
    <nav className={`${styles.nav} ${className ?? ""}`} aria-label="Разделы страницы" data-scrolled={scrolled ? "true" : "false"}>
      <ul ref={listRef} className={styles.list}>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={section.href ?? `/#${section.id}`}
              data-section={section.id}
              className={styles.link}
              aria-current={
                section.href ? (pathname.startsWith(section.href) ? "page" : undefined) : active === section.id ? "true" : undefined
              }
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
