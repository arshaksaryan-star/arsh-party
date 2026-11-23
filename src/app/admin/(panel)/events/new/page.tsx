import Link from "next/link";
import { EventForm } from "@/components/admin/EventForm";
import { isSupabaseConfigured } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

export default function AdminNewEventPage() {
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Новый праздник</h1>
        <Link href="/admin/events" className={styles.secondary}>
          ← Все праздники
        </Link>
      </div>
      <p className={styles.pageHint}>Сначала сохраните описание — затем откроется загрузка фото.</p>
      <EventForm event={null} disabled={!isSupabaseConfigured()} />
    </>
  );
}
