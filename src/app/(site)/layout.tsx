import { YandexMetrika } from "@/components/analytics/YandexMetrika";
import { RefCatcher } from "@/components/zvezda/RefCatcher";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { EdgeSparks } from "@/components/layout/EdgeSparks";
import { FloatingContacts } from "@/components/layout/FloatingContacts";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ScrollTopButton } from "@/components/layout/ScrollTopButton";

/** Публичная часть сайта: шапка с навигацией, подвал, искры и кнопки связи. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="content">{children}</main>
      <Footer />
      <EdgeSparks />
      <FloatingContacts />
      <ScrollTopButton />
      <CookieBanner />
      <YandexMetrika />
      <RefCatcher />
    </>
  );
}
