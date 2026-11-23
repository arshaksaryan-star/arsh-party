import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteEvent, removeEventPhoto, setEventCover } from "@/app/admin/actions";
import { EventForm } from "@/components/admin/EventForm";
import { EventPhotoUploader } from "@/components/admin/EventPhotoUploader";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { MAX_EVENT_PHOTOS, type EventRow } from "@/lib/events";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEventPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !isSupabaseConfigured()) notFound();
  let event: EventRow | undefined;
  try {
    [event] = await selectRows<EventRow>("events", `?select=*&id=eq.${id}`, "no-store");
  } catch (error) {
    console.error("[admin] event", error);
  }
  if (!event) notFound();
  const photos = event.photos ?? [];

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{event.title}</h1>
        <div className={styles.inlineActions}>
          {event.is_published ? (
            <Link href={`/prazdniki?e=${event.id}`} target="_blank" className={styles.secondary}>
              Открыть на сайте ↗
            </Link>
          ) : null}
          <Link href="/admin/events" className={styles.secondary}>
            ← Все праздники
          </Link>
        </div>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Фото · {photos.length} из {MAX_EVENT_PHOTOS}
        </h2>
        {photos.length > 0 ? (
          <ul className={styles.photoGrid}>
            {photos.map((url) => (
              <li key={url} className={styles.photoCell}>
                <img src={url} alt="" className={styles.photoCellImg} />
                {event.cover_url === url ? <span className={styles.coverMark}>Обложка</span> : null}
                <div className={styles.photoCellActions}>
                  {event.cover_url !== url ? (
                    <form action={setEventCover}>
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="url" value={url} />
                      <button type="submit" className={styles.secondary}>
                        Обложкой
                      </button>
                    </form>
                  ) : null}
                  <form action={removeEventPhoto}>
                    <input type="hidden" name="id" value={event.id} />
                    <input type="hidden" name="url" value={url} />
                    <ConfirmButton label="Удалить" confirmLabel="Точно?" className={`${styles.secondary} ${styles.danger}`} />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>Добавьте фото — первое станет обложкой. Её можно поменять кнопкой «Обложкой».</p>
        )}
        {photos.length < MAX_EVENT_PHOTOS ? <EventPhotoUploader eventId={event.id} left={MAX_EVENT_PHOTOS - photos.length} /> : null}
      </section>

      <EventForm event={event} disabled={false} />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Удалить праздник</h2>
        <p className={styles.hint}>Удаляет праздник и все его фото навсегда. Видео в VK останутся. Чтобы просто убрать с сайта, снимите галочку «Показывать на сайте».</p>
        <form action={deleteEvent}>
          <input type="hidden" name="id" value={event.id} />
          <ConfirmButton label="Удалить праздник" confirmLabel="Да, удалить навсегда" className={`${styles.secondary} ${styles.danger}`} />
        </form>
      </section>
    </>
  );
}
