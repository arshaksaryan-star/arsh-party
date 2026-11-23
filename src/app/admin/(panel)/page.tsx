import { CircleUploader } from "@/components/admin/CircleUploader";
import { SiteForm } from "@/components/admin/SiteForm";
import { loadContent } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

export default async function AdminSitePage() {
  // Без кэша: в админке всегда последние сохранённые данные.
  const { site, circles } = await loadContent("no-store");
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Контакты и тексты</h1>
        <p className={styles.pageHint}>
          Пустое поле скрывает этот пункт на сайте. После сохранения изменения сразу видны посетителям.
        </p>
      </div>
      <CircleUploader
        slot="greeting"
        title="Arsh Live — видео-приветствие в кружочке на главной"
        hint="Короткое видео 15–40 секунд, лицо по центру. Кружочек из Telegram подходит идеально — сервер сам обрежет видео в квадрат и сожмёт. Меняется редко. Свежие кружочки из канала Arsh Live подтягиваются на сайт сами."
        video={circles.greeting?.video ?? null}
        poster={circles.greeting?.poster ?? null}
        hidden={circles.greeting?.hidden ?? false}
        disabled={!isSupabaseConfigured()}
      />
      <SiteForm site={site} disabled={!isSupabaseConfigured()} />
    </>
  );
}
