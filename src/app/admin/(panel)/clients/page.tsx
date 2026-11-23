import { access } from "node:fs/promises";
import path from "node:path";
import { ClientsBoard } from "@/components/admin/ClientsBoard";
import { loadClients, type ClientWithStats } from "@/lib/clients-data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadZvezda } from "@/lib/zvezda";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  let clients: ClientWithStats[] = [];
  let error = false;
  if (isSupabaseConfigured()) {
    try {
      clients = await loadClients();
    } catch (problem) {
      console.error("[admin] clients", problem);
      error = true;
    }
  }
  const settings = await loadZvezda("no-store");
  const hasStartFile = await access(path.join(process.cwd(), "private", "clients-start.json"))
    .then(() => true)
    .catch(() => false);
  const imported = clients.some((client) => client.source?.startsWith("переписка"));
  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Клиенты</h1>
        <p className={styles.pageHint}>
          Один человек — одна строка с постоянным номером AP-… Телефон защищает от дублей. Выполненные заказы с сайта подтягиваются сами;
          прошлые и телефонные — добавьте в карточке клиента. Нажмите на заголовок столбца, чтобы отсортировать, на строку — чтобы открыть
          карточку.
        </p>
      </div>
      {error ? <p className={styles.notice}>Не удалось загрузить клиентов. Проверьте, что выполнена схема базы (deploy.sh делает это сам).</p> : null}
      <ClientsBoard clients={clients} raceVisible={settings.raceVisible} canImport={hasStartFile && !imported} />
    </>
  );
}
