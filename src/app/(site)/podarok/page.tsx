import type { Metadata } from "next";
import { GiftShop } from "@/components/gift/GiftShop";
import { CERT_VALID_MONTHS } from "@/lib/certificates";
import { isOnlinePaymentConfigured } from "@/lib/payments";
import styles from "@/components/gift/gift.module.css";

export const metadata: Metadata = {
  title: "Подарочный сертификат",
  description: "Подарите праздник от Arsh Party: доставка с мангала, девичник или мальчишник с шашлыком, ведущий, кейтеринг или своя сумма.",
};

const FAQ = [
  { q: "Как воспользоваться сертификатом?", a: "Позвоните или напишите Аршу и назовите код с сертификата. Сумма спишется с сертификата." },
  { q: "Можно потратить частями?", a: "Да. Остаток сохраняется на сертификате до конца срока." },
  { q: "Сколько он действует?", a: `${CERT_VALID_MONTHS} месяцев с дня оплаты. Дата есть на самом сертификате.` },
  { q: "Можно на другую услугу, не ту, что в названии?", a: "Да. Название — подсказка к поводу, а потратить сумму можно на любое направление Arsh Party." },
  { q: "Как подарить?", a: "После оформления у сертификата будет своя страница — перешлите ссылку в мессенджере или распечатайте." },
];

export default function GiftPage() {
  return (
    <section className={`container ${styles.page}`} aria-labelledby="gift-title">
      <div>
        <p className={styles.eyebrow}>Подарочный сертификат</p>
        <h1 id="gift-title" className={styles.title}>
          Подарите праздник,
          <br />а не вещь
        </h1>
      </div>
      <p className={styles.lead}>
        Шашлык с огня, весёлый вечер для своих, ведущий или целый кейтеринг. Выберите повод — мы сделаем остальное. А сертификат на
        свою сумму — лучший способ поддержать малый бизнес и прийти к нам на шашлык.
      </p>
      <GiftShop online={isOnlinePaymentConfigured()} />
      <div className={styles.faq}>
        {FAQ.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
