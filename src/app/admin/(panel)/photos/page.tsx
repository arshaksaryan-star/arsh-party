import { ArshPhotos } from "@/components/admin/ArshPhotos";
import { mergePhotos, PHOTO_SLOTS } from "@/content/photos";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage() {
  let raw: Record<string, unknown> = {};
  let error = false;
  if (isSupabaseConfigured()) {
    try {
      const [row] = await selectRows<{ data: Record<string, unknown> | null }>("content", "?select=data&key=eq.photos", "no-store");
      raw = row?.data ?? {};
    } catch (problem) {
      console.error("[admin] photos", problem);
      error = true;
    }
  }
  const photos = mergePhotos(raw);
  const items = PHOTO_SLOTS.map((item) => ({ ...item, current: photos[item.slot], custom: typeof raw[item.slot] === "string" }));
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Фото Арша</h1>
        <p className={styles.pageHint}>
          Фото в блоке «О нас» (7 слайдов по порядку), в карточке «Ведущий» и с жестом «ок». Выберите снимок — большой уменьшим сами — и
          нажмите «Заменить». В «О нас» фото обрезается квадратом — главное держите по центру кадра.
        </p>
      </div>
      {error ? <p className={styles.notice}>Не удалось загрузить данные. Проверьте, что выполнена схема базы (deploy.sh делает это сам).</p> : null}
      <ArshPhotos items={items} disabled={!isSupabaseConfigured()} />
    </>
  );
}
