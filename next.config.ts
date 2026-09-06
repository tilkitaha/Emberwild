import type { NextConfig } from "next";

const assetPrefix = process.env.STATIC_CDN_PREFIX ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  assetPrefix,
};

export default nextConfig;
