import styles from "./HowItWorks.module.css";

const steps = [
  {
    title: "Выберите звезду",
    text: "Еда с мангала, СШП, кейтеринг, праздник под ключ или ведущий.",
  },
  {
    title: "Оставьте контакты",
    text: "Заказ из меню или короткая заявка. Без регистрации.",
  },
  {
    title: "Мы на связи",
    text: "Подтверждаем по телефону и приезжаем — в Рязани и по всему ЦФО.",
  },
];

export function HowItWorks() {
  return (
    <section className={`container ${styles.section}`} aria-labelledby="how-title">
      <h2 id="how-title" className={styles.heading}>
        Как это работает
      </h2>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.number} aria-hidden="true">
              {index + 1}
            </span>
            <h3 className={styles.title}>{step.title}</h3>
            <p className={styles.text}>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
