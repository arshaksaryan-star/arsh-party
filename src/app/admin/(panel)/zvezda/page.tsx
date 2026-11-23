import { ZvezdaAdmin, type PartnerRow } from "@/components/admin/ZvezdaAdmin";
import type { AmbassadorRow, CoinRow } from "@/lib/ambassadors";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import { parseZvezda } from "@/lib/zvezda-shared";
import { isZvezdaConfigured, loadZvezda } from "@/lib/zvezda";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminZvezdaPage() {
  let ambassadors: AmbassadorRow[] = [];
  let ledger: CoinRow[] = [];
  let partners: PartnerRow[] = [];
  let settings = parseZvezda(null);
  let error = false;
  if (isSupabaseConfigured()) {
    try {
      [ambassadors, ledger, partners, settings] = await Promise.all([
        selectRows<AmbassadorRow>("ambassadors", "?select=*&order=created_at.desc&limit=1000", "no-store"),
        selectRows<CoinRow>("coin_ledger", "?select=*&order=created_at.desc&limit=5000", "no-store"),
        selectRows<PartnerRow>("partner_requests", "?select=*&order=created_at.desc&limit=200", "no-store"),
        loadZvezda("no-store"),
      ]);
    } catch (problem) {
      console.error("[admin] zvezda", problem);
      error = true;
    }
  }
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Тайная звезда</h1>
        <p className={styles.pageHint}>
          Страница /zvezda — вход по паролю с визитки или по QR-ссылке /zvezda/vhod?k=пароль. Коины начисляются сами, когда вы ставите
          заказу статус «Выполнен»: 5% заказчику-амбассадору и 5% другу, чей код указан. При отмене заказа потраченные коины возвращаются.
          Праздники — списывайте и начисляйте здесь вручную.
        </p>
      </div>
      {!isZvezdaConfigured() ? (
        <p className={styles.notice}>
          Пароль не задан: добавьте строку <code>ZVEZDA_PASSWORD=…</code> в .env.local и обновите сайт. Пока его нет, страница закрыта для всех.
        </p>
      ) : null}
      {error ? <p className={styles.notice}>Не удалось загрузить данные. Проверьте, что выполнена схема базы (deploy.sh делает это сам).</p> : null}
      <ZvezdaAdmin ambassadors={ambassadors} ledger={ledger} partners={partners} settings={settings} disabled={!isSupabaseConfigured()} />
    </>
  );
}
