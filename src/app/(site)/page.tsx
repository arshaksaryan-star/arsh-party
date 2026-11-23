import { EventsBlock } from "@/components/events/EventsBlock";
import { AboutArsh } from "@/components/home/AboutArsh";
import { ArshLive } from "@/components/home/ArshLiveSection";
import { Contacts } from "@/components/home/Contacts";
import { DirectionCard } from "@/components/home/DirectionCard";
import { HeroConstellation } from "@/components/home/HeroConstellation";
import { HomeBar } from "@/components/home/HomeBar";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Reviews } from "@/components/home/Reviews";
import { SocialFeed } from "@/components/home/SocialFeed";
import { ThanksButton } from "@/components/home/ThanksButton";
import { OrderSection } from "@/components/order/OrderSection";
import { getContent } from "@/lib/content";
import styles from "./page.module.css";

export default async function HomePage() {
  const { directions } = await getContent();
  return (
    <>
      <HeroConstellation />
      <ArshLive />

      <section id="directions" className={`container ${styles.directions}`} aria-labelledby="directions-title">
        <div className={styles.head}>
          <h2 id="directions-title" className={styles.heading}>
            Пять звёзд
          </h2>
          <p className={styles.sub}>Выберите звезду — расскажем, что входит, и примем заявку. Работаем в Рязани и по всему ЦФО.</p>
        </div>
        <div className={styles.grid}>
          {directions.map((direction) => (
            <DirectionCard key={direction.slug} direction={direction} />
          ))}
        </div>
        <ThanksButton />
      </section>

      <AboutArsh />
      <Reviews />
      <EventsBlock
        title="Праздники, которые уже случились"
        sectionClass={`container ${styles.events}`}
        headingClass={styles.heading}
        moreClass={styles.more}
      />
      <HowItWorks />
      <OrderSection />
      <SocialFeed />
      <Contacts />
      <HomeBar />
    </>
  );
}
