import { CertificatesBoard } from "@/components/admin/CertificatesBoard";
import { certSummary, type CertificateRow } from "@/lib/certificates";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

type UseRow = { certificate_id: string; amount: number; note: string | null; created_at: string };

export default async function AdminCertificatesPage() {
  let rows: CertificateRow[] = [];
  let uses: UseRow[] = [];
  let error = false;
  if (isSupabaseConfigured()) {
    try {
      [rows, uses] = await Promise.all([
        selectRows<CertificateRow>("certificates", "?select=*&status=neq.cancelled&order=created_at.desc&limit=500", "no-store"),
        selectRows<UseRow>("certificate_uses", "?select=certificate_id,amount,note,created_at&order=created_at.desc&limit=2000", "no-store"),
      ]);
    } catch (problem) {
      console.error("[admin] certificates", problem);
      error = true;
    }
  }
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Сертификаты</h1>
        <p className={styles.pageHint}>
          Продажи с /podarok. Пока онлайн-оплата не подключена: пришлите покупателю ссылку на оплату, затем нажмите «Оплачен» — сертификат
          начнёт действовать на 12 месяцев. Клиент называет код — найдите его и спишите сумму.
        </p>
      </div>
      {error ? <p className={styles.notice}>Не удалось загрузить сертификаты. Проверьте, что выполнена схема базы.</p> : null}
      <CertificatesBoard rows={rows} uses={uses} summary={certSummary(rows)} disabled={!isSupabaseConfigured()} />
    </>
  );
}
