"use client";

import { useEffect, useRef } from "react";

/**
 * Лента отзывов. На компьютере её крутит CSS-анимация.
 * На телефоне (нет наведения) лента листается пальцем, а сама переходит к следующему отзыву каждые 4,5 с;
 * после касания пальцем ждёт 10 с, в конце возвращается к началу.
 */
export function ReviewsViewport({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = ref.current;
    if (!viewport) return;
    if (!window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pausedUntil = 0;
    let visible = false;
    const pause = () => {
      pausedUntil = Date.now() + 10_000;
    };
    viewport.addEventListener("touchstart", pause, { passive: true });
    viewport.addEventListener("pointerdown", pause, { passive: true });

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(viewport);

    const timer = window.setInterval(() => {
      if (!visible || document.hidden || Date.now() < pausedUntil) return;
      const card = viewport.querySelector<HTMLElement>("article");
      const step = card ? card.offsetWidth + 14 : viewport.clientWidth * 0.8;
      const atEnd = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 8;
      viewport.scrollTo({ left: atEnd ? 0 : viewport.scrollLeft + step, behavior: "smooth" });
    }, 4500);

    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      viewport.removeEventListener("touchstart", pause);
      viewport.removeEventListener("pointerdown", pause);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
