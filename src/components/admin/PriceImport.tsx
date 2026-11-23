"use client";

import { useActionState } from "react";
import { importPrices } from "@/app/admin/actions";
import { FormMessage, SubmitButton } from "./FormParts";
import styles from "./admin.module.css";

/** Цены из Excel: скачать прайс, поправить и загрузить обратно — или вставить строки прямо из Excel. */
export function PriceImport({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(importPrices, null);
  return (
    <details className={styles.card}>
      <summary className={styles.cardTitle} style={{ cursor: "pointer" }}>
        📊 Цены из Excel
      </summary>
      <p className={styles.hint}>
        1. <a href="/api/admin/menu-csv">Скачайте прайс</a> — откроется в Excel. 2. Поправьте столбцы «Цена» и «Вес» (пустая цена — «цена
        уточняется»). 3. Сохраните как CSV и загрузите ниже — или выделите строки в Excel вместе с заголовками и вставьте в поле. Блюда
        ищем по столбцу id или по названию; новые блюда так не добавляются.
      </p>
      <form action={action} className={styles.field}>
        <textarea name="table" className={`${styles.input} ${styles.textarea}`} rows={6} placeholder={"Название\tВес\tЦена\nШея\t230 г\t600"} />
        <label className={styles.label}>
          или файл CSV:{" "}
          <input type="file" name="file" accept=".csv,text/csv,text/plain" />
        </label>
        <div className={styles.actions}>
          {disabled ? (
            <button type="button" className={styles.primary} disabled>
              Обновить цены
            </button>
          ) : (
            <SubmitButton pendingText="Обновляем…">Обновить цены</SubmitButton>
          )}
          <FormMessage state={state} />
        </div>
      </form>
    </details>
  );
}
