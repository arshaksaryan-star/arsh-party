"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { CONSENT_EVENT, readConsent, type Consent } from "@/lib/consent";

/** Номер счётчика Яндекс Метрики Arsh Party. */
export const METRIKA_ID = 114139236;

type Ym = (id: number, method: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    ym?: Ym;
  }
}

/**
 * Яндекс Метрика: посещения, Вебвизор, карта кликов.
 * Загружается только после согласия посетителя в плашке о cookie (CookieBanner)
 * и только в боевой сборке (npm run build + npm run start, или на хостинге),
 * чтобы просмотры на localhost во время разработки не попадали в статистику.
 * Переходы между страницами без перезагрузки отправляются отдельным хитом.
 */
export function YandexMetrika() {
  const pathname = usePathname();
  const firstRender = useRef(true);
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onChange = (event: Event) => setConsent((event as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    // Первый просмотр засчитывает сам init, повторно не отправляем.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.ym?.(METRIKA_ID, "hit", window.location.href, { referer: document.referrer });
  }, [pathname]);

  if (process.env.NODE_ENV !== "production" || consent !== "granted") return null;

  return (
    <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}', 'ym');
ym(${METRIKA_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`}
    </Script>
  );
}
