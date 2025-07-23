import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For dashboard with Clerk authentication, we need SSR
  // output: 'export', // Commented out - not compatible with Clerk
  
  // Image optimization settings
  images: {
    unoptimized: true,
  },
  
  // Trailing slash setting
  trailingSlash: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://fitai-api.sweetspot-627.workers.dev',
  },
};

export default nextConfig;
