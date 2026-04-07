import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["rezka.zorg.local", "*.zorg.local", "rezka.local", "*.local"],
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/data/**', '**/node_modules/**'],
    };
    return config;
  },
  turbopack: {},
};

export default nextConfig;
