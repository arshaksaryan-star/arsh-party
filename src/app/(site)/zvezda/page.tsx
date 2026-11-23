import type { Metadata } from "next";
import { GiftShop } from "@/components/gift/GiftShop";
import { Star } from "@/components/ui/Star";
import { JoinForm } from "@/components/zvezda/JoinForm";
import { PartnerForm } from "@/components/zvezda/PartnerForm";
import { ZvezdaGate } from "@/components/zvezda/ZvezdaGate";
import { accentVars } from "@/content/directions";
import { COIN_CAP_EVENTS, COIN_CAP_MANGAL, COIN_EARN_PERCENT } from "@/lib/ambassadors";
import { KOPILKA, KOPILKA_OFFER } from "@/lib/certificates";
import { todayInMoscow } from "@/lib/lead";
import { isOnlinePaymentConfigured } from "@/lib/payments";
import { activePerks, visibleOffers } from "@/lib/zvezda-shared";
import { hasZvezdaAccess, isZvezdaConfigured, loadZvezda } from "@/lib/zvezda";
import styles from "@/components/zvezda/zvezda.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Тайная звезда", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ oops?: string }> };

function dateRu(iso: string): string {
  return new Date(`${iso}T12:00:00+03:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" });
}

/** Тайная страница для своих: вход по паролю с визитки или по QR. */
export default async function ZvezdaPage({ searchParams }: Props) {
  const { oops } = await searchParams;
  if (!isZvezdaConfigured() || !(await hasZvezdaAccess())) {
    return (
      <section className={`container ${styles.page}`} aria-label="Тайная звезда">
        <ZvezdaGate oops={oops === "1"} />
      </section>
    );
  }

  const settings = await loadZvezda();
  const offers = visibleOffers(settings.offers, todayInMoscow());
  const perks = activePerks(settings.perks);
  const maxBonus = KOPILKA.percent * KOPILKA.maxMonths;

  return (
    <div className={`container ${styles.page}`} style={accentVars("orange") as React.CSSProperties}>
      <section className={styles.hero} aria-labelledby="zv-title">
        <Star className={styles.heroStar} />
        <p className={styles.heroEyebrow}>Тайная звезда</p>
        <h1 id="zv-title" className={styles.heroTitle}>
          Вы её нашли
        </h1>
        <p className={styles.heroText}>Этой страницы нет в меню. Сюда попадают с визиткой Арша — и получают то, чего нет на сайте.</p>
        <nav className={styles.jump} aria-label="Разделы">
          <a href="#kopilka">Копилка</a>
          <a href="#ambassador">Амбассадор</a>
          {offers.length > 0 ? <a href="#offers">Только здесь</a> : null}
          <a href="#partner">Сотрудничество</a>
        </nav>
      </section>

      {offers.length > 0 ? (
        <section id="offers" className={styles.section} aria-labelledby="zv-offers">
          <h2 id="zv-offers" className={styles.sectionTitle}>
            Только для своих
          </h2>
          <ul className={styles.offers}>
            {offers.map((offer) => (
              <li key={offer.id} className={styles.offerCard}>
                <h3>{offer.title}</h3>
                {offer.text ? <p>{offer.text}</p> : null}
                {offer.until ? <span className={styles.until}>до {dateRu(offer.until)}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="kopilka" className={styles.section} aria-labelledby="zv-kopilka">
        <h2 id="zv-kopilka" className={styles.sectionTitle}>
          Сертификат-копилка
        </h2>
        <p className={styles.sectionLead}>
          Купили — и не торопитесь. Пока сертификат лежит нетронутым, каждый полный месяц он прирастает на {KOPILKA.percent}% шашлыком. Полгода
          терпения — плюс {maxBonus}%. Растёт в шашлыке, а не в рублях.
        </p>
        <ul className={styles.facts}>
          <li className={styles.fact}>
            <span className={styles.factBig}>+{KOPILKA.percent}%</span>
            <p>за каждый полный месяц, пока не тратите</p>
          </li>
          <li className={styles.fact}>
            <span className={styles.factBig}>до +{maxBonus}%</span>
            <p>рост идёт {KOPILKA.maxMonths} месяцев, дальше сумма просто ждёт вас</p>
          </li>
          <li className={styles.fact}>
            <span className={styles.factBig}>12 мес.</span>
            <p>срок сертификата. Первая трата фиксирует бонус — дальше тратьте частями</p>
          </li>
        </ul>
        <GiftShop online={isOnlinePaymentConfigured()} offers={[KOPILKA_OFFER]} initial="kopilka" />
        <p className={styles.sectionLead} style={{ fontSize: 14 }}>
          Бонус — это наши услуги: шашлык, праздник, ведущий. Деньгами он не выдаётся, при возврате сертификата сгорает.
        </p>
      </section>

      <section id="ambassador" className={styles.section} aria-labelledby="zv-amb">
        <h2 id="zv-amb" className={styles.sectionTitle}>
          Станьте амбассадором
        </h2>
        <p className={styles.sectionLead}>
          Рассказываете друзьям про наш шашлык? Пусть это работает на вас. Личный код — просто ваше имя, а с каждого заказа капают
          шашлыкоины.
        </p>
        <ul className={styles.facts}>
          <li className={styles.fact}>
            <span className={styles.factBig}>{COIN_EARN_PERCENT}%</span>
            <p>шашлыкоинами — с ваших заказов и с заказов друзей по вашему коду</p>
          </li>
          <li className={styles.fact}>
            <span className={styles.factBig}>до {COIN_CAP_MANGAL}%</span>
            <p>заказа с мангала можно оплатить коинами — прямо при оформлении</p>
          </li>
          <li className={styles.fact}>
            <span className={styles.factBig}>до {COIN_CAP_EVENTS}%</span>
            <p>праздника — скажите Аршу, он спишет</p>
          </li>
        </ul>
        {perks.length > 0 ? (
          <>
            <p className={styles.sectionLead}>
              <b>А другу по вашему коду:</b>
            </p>
            <ul className={styles.perks}>
              {perks.map((perk) => (
                <li key={perk.id}>{perk.title}</li>
              ))}
            </ul>
          </>
        ) : null}
        <JoinForm />
        <a href="/zvezda/pravila" className={styles.rulesLink}>
          Правила программы →
        </a>
      </section>

      <section id="partner" className={styles.section} aria-labelledby="zv-partner">
        <h2 id="zv-partner" className={styles.sectionTitle}>
          Есть дельное предложение?
        </h2>
        <p className={styles.sectionLead}>Площадка, совместный праздник, коллаборация, идея, от которой выиграют оба. Напишите — Арш читает сам.</p>
        <PartnerForm />
      </section>
    </div>
  );
}
