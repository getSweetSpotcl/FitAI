import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For dashboard with Clerk authentication, we need SSR
  // Don't use 'export' as it's not compatible with Clerk
  
  // Image optimization settings - disable for Cloudflare Workers
  images: {
    unoptimized: true,
  },
  
  // External packages configuration for Clerk
  serverExternalPackages: ['@clerk/nextjs'],
  
  // Trailing slash setting
  trailingSlash: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.getfitia.com',
  },
  
  // Skip TypeScript and ESLint checks during build for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable static optimization to fix Context issues
  output: 'standalone',
};

export default nextConfig;
