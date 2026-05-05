import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose"],
  images: {
    unoptimized: true,
  },
  devIndicators: false,
};

export default nextConfig;
