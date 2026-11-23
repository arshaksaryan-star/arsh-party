/** «arshparty.ru» или «https://arshparty.ru/» → «https://arshparty.ru». */
export function siteOrigin(siteUrl: string | null | undefined): string {
  const raw = (siteUrl ?? "").trim() || "arshparty.ru";
  const withProtocol = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "https://arshparty.ru";
  }
}
