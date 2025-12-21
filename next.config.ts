import type { NextConfig } from "next";

// Only apply basePath for GitHub Pages deployment (production builds)
// For local development, basePath should be empty
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  ...(basePath && {
    basePath,
    assetPrefix: basePath,
  }),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
