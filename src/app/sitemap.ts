import type { MetadataRoute } from "next";
import { defaultDirections } from "@/content/directions";
import { getContent } from "@/lib/content";
import { siteOrigin } from "@/lib/site-url";

/** /sitemap.xml — все открытые страницы для Яндекса и Google. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { site } = await getContent();
  const origin = siteOrigin(site.siteUrl);
  const now = new Date();
  return [
    { url: `${origin}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...defaultDirections.map((direction) => ({
      url: `${origin}/${direction.slug}`,
      lastModified: now,
      changeFrequency: direction.slug === "mangal" ? ("daily" as const) : ("weekly" as const),
      priority: 0.9,
    })),
    { url: `${origin}/prazdniki`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${origin}/podarok`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${origin}/kalkulyator`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${origin}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/soglasie`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/rassylka`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
