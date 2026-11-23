"use client";

import { useEffect, useState } from "react";
import { AMB_KEY, writeLocal } from "./amb-storage";
import styles from "./zvezda.module.css";

/** Кабинет: запоминаем ключ на этом телефоне (для списания коинов в корзине) и даём скопировать ссылку для друзей. */
export function KabinetTools({ secret, code }: { secret: string; code: string }) {
  const [link, setLink] = useState(`/mangal?ot=${code}`);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    writeLocal(AMB_KEY, secret);
    setLink(`${window.location.origin}/mangal?ot=${code}`);
  }, [secret, code]);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied(null);
    }
  }

  async function share() {
    const text = `Заказываю шашлык у Arsh Party — попробуй. По моему коду ${code} тебе будут плюшки: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // отменили — ничего страшного
      }
    }
    copy(text, "text");
  }

  return (
    <div className={styles.codeBox}>
      <span className={styles.code}>{code}</span>
      <button type="button" className={styles.copy} onClick={() => copy(code, "code")}>
        {copied === "code" ? "Скопирован" : "Копировать код"}
      </button>
      <button type="button" className={styles.copy} onClick={share}>
        {copied === "text" ? "Ссылка скопирована" : "Поделиться ссылкой"}
      </button>
    </div>
  );
}
