import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { accentVars } from "@/content/directions";
import { Star } from "@/components/ui/Star";
import { PrintButton } from "@/components/gift/PrintButton";
import { CERT_VIEW_LABEL, certGrowth, certView, KOPILKA, normalizeCode, offerFor, type CertificateRow } from "@/lib/certificates";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";
import { getContent } from "@/lib/content";
import styles from "@/components/gift/gift.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Подарочный сертификат", robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }> };

function rub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function date(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" }) : "";
}

/** Страница сертификата: её пересылают получателю или печатают. */
export default async function CertificatePage({ params }: Props) {
  const { code: raw } = await params;
  const code = normalizeCode(decodeURIComponent(raw));
  if (!/^ARSH-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) || !isSupabaseConfigured()) notFound();
  const [row] = await selectRows<CertificateRow>("certificates", `?select=*&code=eq.${code}`, "no-store").catch(() => []);
  if (!row || row.status === "cancelled") notFound();

  const view = certView(row);
  const offer = offerFor(row.kind);
  const { site } = await getContent();
  const isKopilka = row.kind === "kopilka";
  const growth = certGrowth(row);
  const frozenBonus = row.bonus ?? 0;

  return (
    <section className={`container ${styles.page}`} style={accentVars(offer?.star ?? "red") as React.CSSProperties} aria-label="Подарочный сертификат">
      <div className={styles.cert}>
        <Star className={styles.certGlow} />
        <div className={styles.certTop}>
          <span className={styles.certBrand}>ARSH PARTY</span>
          <span className={styles.certMeta}>Подарочный сертификат</span>
        </div>
        <div>
          <p className={styles.certAmount}>{rub(row.amount)}</p>
          <p className={styles.certTitle}>{row.title}</p>
        </div>
        <div className={styles.certBottom}>
          <span className={styles.certCode}>{row.code}</span>
          <span className={styles.certMeta}>
            {row.recipient_name ? (
              <>
                для: {row.recipient_name}
                <br />
              </>
            ) : null}
            {row.expires_at ? `действует до ${date(row.expires_at)}` : "срок — 12 месяцев с оплаты"}
          </span>
        </div>
      </div>

      <div className={styles.certInfo}>
        {row.message ? <p className={styles.certMessage}>«{row.message}»</p> : null}
        <p className={styles.certStatus}>
          {CERT_VIEW_LABEL[view]}
          {view === "paid" && row.balance < row.amount ? ` · остаток ${rub(row.balance)}` : ""}
          {view === "pending" ? " — сертификат начнёт действовать сразу после оплаты" : ""}
        </p>
        {isKopilka ? (
          <p className={styles.certGrowth}>
            {row.growth_stopped_at
              ? frozenBonus > 0
                ? `Копилка выросла на ${rub(frozenBonus)} шашлыком — бонус уже в остатке.`
                : "Копилку начали тратить — рост остановлен."
              : view === "paid"
                ? growth.months > 0
                  ? `Копилка уже выросла на ${rub(growth.bonus)} шашлыком (${growth.months} мес.). Растёт, пока вы её не трогаете — до ${KOPILKA.maxMonths} месяцев.`
                  : `Каждый полный месяц, пока сертификат не тратят, он прирастает на ${KOPILKA.percent}% шашлыком — до ${KOPILKA.maxMonths} месяцев.`
                : `После оплаты каждый полный месяц ожидания — +${KOPILKA.percent}% шашлыком, до ${KOPILKA.maxMonths} месяцев.`}{" "}
            Растёт в шашлыке, а не в рублях: бонус тратится только на наши услуги и деньгами не выдаётся.
          </p>
        ) : null}
        <p>
          Как воспользоваться: позвоните{site.phone ? ` ${site.phone}` : ""} или напишите Аршу и назовите код <b>{row.code}</b>. Можно
          потратить частями, на любое направление Arsh Party.
        </p>
        <div className={styles.certActions}>
          <PrintButton className={styles.secondary} />
          <a href="/" className={styles.secondary}>
            На сайт Arsh Party
          </a>
        </div>
      </div>
    </section>
  );
}
