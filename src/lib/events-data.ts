import "server-only";
import type { DirectionSlug } from "@/content/directions";
import { EVENTS_TAG, type EventRow } from "@/lib/events";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase";

const COLUMNS = "id,title,direction,event_date,place,summary,quote,quote_author,cover_url,photos,videos,is_published,created_at";

/** Опубликованные праздники, свежие первыми. Без базы — пустой список. */
export async function loadPublishedEvents(direction?: DirectionSlug, limit = 60): Promise<EventRow[]> {
  if (!isSupabaseConfigured()) return [];
  const filter = direction ? `&direction=eq.${direction}` : "";
  try {
    return await selectRows<EventRow>(
      "events",
      `?select=${COLUMNS}&is_published=eq.true${filter}&order=event_date.desc.nullslast,created_at.desc&limit=${limit}`,
      { revalidate: 300, tags: [EVENTS_TAG] },
    );
  } catch (error) {
    console.error("[events]", error);
    return [];
  }
}
