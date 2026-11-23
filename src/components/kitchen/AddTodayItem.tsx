"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTodayItem } from "@/app/kitchen/actions";
import { FormMessage, SubmitButton } from "@/components/admin/FormParts";
import { MENU_CATEGORIES } from "@/lib/menu";
import styles from "./kitchen.module.css";

/** Блюдо дня, которого нет в списке: добавляется и сразу показывается на сайте. */
export function AddTodayItem() {
  const [state, formAction] = useActionState(addTodayItem, null);
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <button type="button" className={styles.addButton} onClick={() => setOpen(true)}>
        ＋ Добавить блюдо дня
      </button>
    );
  }

  return (
    <form ref={form} action={formAction} className={styles.addForm}>
      <h2 className={styles.groupTitle}>Новое блюдо дня</h2>
      <label className={styles.field}>
        <span>Название</span>
        <input name="title" required minLength={2} maxLength={80} placeholder="Например, Шашлык из баранины" />
      </label>
      <label className={styles.field}>
        <span>Раздел</span>
        <select name="category" defaultValue="shashlik">
          {MENU_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          <span>Цена, ₽</span>
          <input name="price" inputMode="numeric" placeholder="Можно пусто" />
        </label>
        <label className={styles.field}>
          <span>Вес или порция</span>
          <input name="weight" maxLength={40} placeholder="200 г" />
        </label>
      </div>
      <FormMessage state={state} />
      <div className={styles.row}>
        <SubmitButton pendingText="Добавляем…">Добавить и показать</SubmitButton>
        <button type="button" className={styles.ghost} onClick={() => setOpen(false)}>
          Закрыть
        </button>
      </div>
    </form>
  );
}
