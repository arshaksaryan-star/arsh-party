import type { SiteConfig } from "@/content/site";
import type { LegalRequisites } from "@/content/legal";

export function requisitesFrom(site: SiteConfig): LegalRequisites {
  return {
    operatorName: site.legalName ?? "",
    inn: site.legalInn ?? "",
    ogrnip: site.legalOgrnip ?? "",
    address: site.legalAddress ?? "",
    email: site.legalEmail ?? "",
    siteUrl: site.siteUrl ?? "",
  };
}
