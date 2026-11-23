import type { Metadata } from "next";
import { EventsExplorer } from "@/components/events/EventsExplorer";
import { OrderSection } from "@/components/order/OrderSection";
import { getContent } from "@/lib/content";
import { loadPublishedEvents } from "@/lib/events-data";

export const metadata: Metadata = {
  title: "Праздники",
  description: "Фото и видео с мероприятий Arsh Party: свадьбы, корпоративы, юбилеи и праздники в Рязани и по всему ЦФО.",
};

export default async function EventsPage() {
  const [{ directions }, events] = await Promise.all([getContent(), loadPublishedEvents()]);
  return (
    <>
      <EventsExplorer events={events} directions={directions} />
      <OrderSection title="Следующая звезда — ваш праздник" />
    </>
  );
}
