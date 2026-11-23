import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Кухня — сегодня на огне",
  robots: { index: false, follow: false },
};

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
