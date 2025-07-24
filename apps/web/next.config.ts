import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization settings - disable for Cloudflare Workers
  images: {
    unoptimized: true,
  },
  
  // Trailing slash setting
  trailingSlash: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.getfitia.com',
  },
  
  // Skip TypeScript and ESLint checks during development
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
