import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages compatibility - use export for static generation
  output: 'export',
  
  // Disable image optimization (not supported on Cloudflare)
  images: {
    unoptimized: true,
  },
  
  // Disable trailing slash for better compatibility
  trailingSlash: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://fitai-api.sweetspot-627.workers.dev',
  },
};

export default nextConfig;
