"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./SectionMenu.module.css";

type Section = { id: string; label: string; href?: string };

/**
 * Разделы на телефоне: одна неподвижная кнопка «☰ Разделы», по нажатию — список под шапкой.
 * (Лента, которая сама ездила за прокруткой, на узком экране дёргалась — владелец, 15.11.2026.)
 */
export function SectionMenu({ sections, className }: { sections: readonly Section[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", () => setOpen(false), { once: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className={`${styles.wrap} ${className ?? ""}`}>
      <button type="button" className={styles.button} aria-expanded={open} aria-controls="section-menu" onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">{open ? "✕" : "☰"}</span> Разделы
      </button>
      {open ? (
        <nav id="section-menu" className={styles.panel} aria-label="Разделы сайта">
          <ul className={styles.list}>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={section.href ?? `/#${section.id}`} className={styles.link} onClick={() => setOpen(false)}>
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
