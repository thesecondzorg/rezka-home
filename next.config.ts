import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["rezka.zorg.local", "*.zorg.local", "rezka.local", "*.local"],
};

export default nextConfig;
