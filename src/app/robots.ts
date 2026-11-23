import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content";
import { siteOrigin } from "@/lib/site-url";

/** /robots.txt — служебные разделы закрыты от поисковиков. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { site } = await getContent();
  const origin = siteOrigin(site.siteUrl);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/kitchen", "/api/", "/otziv", "/orders", "/kabinet", "/sertifikat", "/zvezda"] }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
