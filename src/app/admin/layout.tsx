import type { Metadata } from "next";

// Админка не должна попадать в поиск.
export const metadata: Metadata = {
  title: "Админка",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
