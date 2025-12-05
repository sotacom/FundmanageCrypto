import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    // Only ignore build errors in development, enforce in production
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  // Disable strict mode for compatibility, but consider enabling in future
  reactStrictMode: false,
};

export default nextConfig;
