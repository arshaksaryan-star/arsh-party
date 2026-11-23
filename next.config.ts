import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Фото меню до 5 МБ плюс поля формы.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
