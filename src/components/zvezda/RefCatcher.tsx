"use client";

import { useEffect } from "react";
import { REF_KEY, writeLocal } from "./amb-storage";

/** Ссылка друга вида /mangal?ot=IVAN: запоминаем код, корзина подставит его сама. */
export function RefCatcher() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ot");
    const clean = code?.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean && /^[A-Z0-9]{4,12}$/.test(clean)) writeLocal(REF_KEY, clean);
  }, []);
  return null;
}
