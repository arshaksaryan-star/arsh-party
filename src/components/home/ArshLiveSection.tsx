import { getContent } from "@/lib/content";
import { loadLiveCircles } from "@/lib/live";
import { ArshLiveView } from "./ArshLive";

/** Arsh Live на главной: приветствие + свежий кружок из канала за последнюю неделю. */
export async function ArshLive() {
  const { site } = await getContent();
  if (!site.liveChannelUrl) return null;
  const [fresh] = await loadLiveCircles(site.liveChannelUrl, 1);
  return <ArshLiveView fresh={fresh ?? null} />;
}
