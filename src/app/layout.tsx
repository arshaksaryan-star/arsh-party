import type { Metadata, Viewport } from "next";
import { Onest, Unbounded } from "next/font/google";
import { ContentProvider } from "@/components/content/ContentProvider";
import { EdgeSparks } from "@/components/layout/EdgeSparks";
import { FloatingContacts } from "@/components/layout/FloatingContacts";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getContent } from "@/lib/content";
import { siteOrigin } from "@/lib/site-url";
import "./globals.css";

// Unbounded — широкий гротеск, ближе всего к начертанию логотипа.
const display = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getContent();
  const title = `${site.name} — всё для праздника в Рязани и ЦФО`;
  return {
    metadataBase: new URL(siteOrigin(site.siteUrl)),
    title: { default: title, template: `%s · ${site.name}` },
    description: site.description,
    applicationName: site.name,
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: site.name,
      title,
      description: site.description,
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: site.name }],
    },
    twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0d" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getContent();
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body>
        <ContentProvider value={content}>{children}</ContentProvider>
      </body>
    </html>
  );
}
