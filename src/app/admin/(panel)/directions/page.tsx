import { CircleUploader } from "@/components/admin/CircleUploader";
import { DirectionsForm } from "@/components/admin/DirectionsForm";
import { loadContent } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

export default async function AdminDirectionsPage() {
  const { directions, pages, circles } = await loadContent("no-store");
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Направления</h1>
        <p className={styles.pageHint}>
          Тексты пяти звёзд: карточки, созвездие на главной, форма заявки, подвал и страницы направлений (/mangal, /sshp и другие). Цвета и логотипы меняются в коде.
        </p>
      </div>
      {directions.map((direction) => (
        <CircleUploader
          key={direction.slug}
          slot={direction.slug}
          title={`Кружок «Что такое ${direction.short}?» — /${direction.slug}`}
          hint="Своими словами за 30–60 секунд: что это, кому подходит, как заказать. Кружок вылетает в углу страницы через 12 секунд после захода. Нет видео — кружка нет."
          video={circles[direction.slug]?.video ?? null}
          poster={circles[direction.slug]?.poster ?? null}
          hidden={circles[direction.slug]?.hidden ?? false}
          disabled={!isSupabaseConfigured()}
        />
      ))}
      <DirectionsForm directions={directions} pages={pages} disabled={!isSupabaseConfigured()} />
    </>
  );
}
