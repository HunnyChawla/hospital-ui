import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/hospital-ui",
  assetPrefix: "/hospital-ui",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
