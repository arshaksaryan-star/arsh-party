"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteMenuItem, saveMenuItem } from "@/app/admin/actions";
import { categoryLabel, formatPrice, MENU_CATEGORIES, type MenuItem } from "@/lib/menu";
import { FormMessage, SubmitButton } from "./FormParts";
import styles from "./admin.module.css";

/** Форма одной позиции: и для новой, и для существующей. */
function MenuItemForm({ item, onDone }: { item: MenuItem | null; onDone: () => void }) {
  const [state, formAction] = useActionState(saveMenuItem, null);
  const [deleteState, deleteAction] = useActionState(deleteMenuItem, null);
  const [preview, setPreview] = useState<string | null>(item?.image_url ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // После успешного сохранения новой позиции форма закрывается.
  useEffect(() => {
    if ((state?.ok && !item) || deleteState?.ok) onDone();
  }, [state, deleteState, item, onDone]);

  // Временная ссылка на выбранный файл для предпросмотра.
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className={styles.card}>
      <form action={formAction} className={styles.grid2}>
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <input type="hidden" name="current_image" value={item?.image_url ?? ""} />

        <div className={`${styles.photoField} ${styles.wide}`}>
          {preview ? (
            <img src={preview} alt="" className={styles.photoPreview} />
          ) : (
            <span className={`${styles.photoPreview} ${styles.thumb}`}>Нет фото</span>
          )}
          <div className={styles.field}>
            <span className={styles.label}>Фото</span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : (item?.image_url ?? null));
              }}
            />
            <span className={styles.hint}>JPG, PNG или WebP до 5 МБ. Лучше квадратное, от 800×800</span>
            {item?.image_url ? (
              <label className={styles.check}>
                <input type="checkbox" name="remove_photo" /> Убрать фото
              </label>
            ) : null}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Название</span>
          <input name="title" defaultValue={item?.title ?? ""} className={styles.input} required minLength={2} maxLength={80} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Категория</span>
          <select name="category" defaultValue={item?.category ?? "shashlik"} className={styles.input}>
            {MENU_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Цена, ₽</span>
          <input name="price" defaultValue={item?.price ?? ""} className={styles.input} inputMode="numeric" placeholder="Пусто — «Цена уточняется»" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Вес или объём</span>
          <input name="weight" defaultValue={item?.weight ?? ""} className={styles.input} maxLength={40} placeholder="300 г" />
        </label>
        <label className={`${styles.field} ${styles.wide}`}>
          <span className={styles.label}>Описание</span>
          <textarea name="description" defaultValue={item?.description ?? ""} className={`${styles.input} ${styles.textarea}`} maxLength={300} placeholder="Маринад, подача, с чем подаём" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Порядок в категории</span>
          <input name="sort" defaultValue={item?.sort ?? 0} className={styles.input} inputMode="numeric" />
          <span className={styles.hint}>Меньше число — выше в списке</span>
        </label>
        <label className={styles.check}>
          <input type="checkbox" name="is_available" defaultChecked={item?.is_available ?? true} /> Есть в наличии
        </label>

        <div className={`${styles.inlineActions} ${styles.wide}`}>
          <SubmitButton>{item ? "Сохранить" : "Добавить в меню"}</SubmitButton>
          <button type="button" className={styles.secondary} onClick={onDone}>
            {item ? "Свернуть" : "Отмена"}
          </button>
          <FormMessage state={state} />
        </div>
      </form>

      {item ? (
        <form action={deleteAction} className={styles.inlineActions}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="current_image" value={item.image_url ?? ""} />
          {confirmDelete ? (
            <>
              <span>Удалить «{item.title}» из меню навсегда?</span>
              <button type="submit" className={`${styles.secondary} ${styles.danger}`}>
                Да, удалить
              </button>
              <button type="button" className={styles.secondary} onClick={() => setConfirmDelete(false)}>
                Нет
              </button>
            </>
          ) : (
            <button type="button" className={`${styles.secondary} ${styles.danger}`} onClick={() => setConfirmDelete(true)}>
              Удалить позицию
            </button>
          )}
          <FormMessage state={deleteState} />
        </form>
      ) : null}
    </div>
  );
}

export function MenuManager({ items, disabled }: { items: MenuItem[]; disabled: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const groups = MENU_CATEGORIES.map((category) => ({
    ...category,
    items: items.filter((item) => item.category === category.id),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <div className={styles.toolbar}>
        <button type="button" className={styles.primary} onClick={() => setAdding(true)} disabled={disabled || adding}>
          + Добавить позицию
        </button>
        <span className={styles.hint}>
          {items.length} позиций · {items.filter((item) => item.price === null).length} без цены
        </span>
      </div>

      {adding ? <MenuItemForm item={null} onDone={() => setAdding(false)} /> : null}

      {groups.length === 0 && !adding ? (
        <p className={styles.empty}>Меню пока пустое. Нажмите «Добавить позицию», чтобы внести первое блюдо.</p>
      ) : null}

      {groups.map((group) => (
        <section key={group.id} className={styles.category}>
          <h2 className={styles.categoryTitle}>{group.label}</h2>
          {group.items.map((item) =>
            openId === item.id ? (
              <MenuItemForm key={item.id} item={item} onDone={() => setOpenId(null)} />
            ) : (
              <div key={item.id} className={styles.item}>
                {item.image_url ? (
                  <img src={item.image_url} alt="" className={styles.thumb} loading="lazy" />
                ) : (
                  <span className={styles.thumb}>Нет фото</span>
                )}
                <div className={styles.itemText}>
                  <span className={styles.itemTitle}>
                    {item.title}
                    {item.is_available ? null : <span className={styles.badgeOff}>нет в наличии</span>}
                  </span>
                  <span className={styles.itemMeta}>
                    {formatPrice(item.price)}
                    {item.weight ? ` · ${item.weight}` : ""} · {categoryLabel(item.category)}
                  </span>
                </div>
                <button type="button" className={styles.secondary} onClick={() => setOpenId(item.id)} disabled={disabled}>
                  Изменить
                </button>
              </div>
            ),
          )}
        </section>
      ))}
    </>
  );
}
