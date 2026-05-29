import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Flat config + @eslint/eslintrc is not wired for CI builds yet.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
