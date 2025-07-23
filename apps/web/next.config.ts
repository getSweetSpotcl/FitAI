import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Cloudflare Workers
  output: 'standalone',
  
  // Image optimization settings - disable for Cloudflare Workers
  images: {
    unoptimized: true,
  },
  
  // Disable service worker for Cloudflare compatibility
  experimental: {
    serverComponentsExternalPackages: ['@clerk/nextjs'],
  },
  
  // Trailing slash setting
  trailingSlash: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.getfitia.com',
  },
  
  // Webpack configuration for Cloudflare Workers compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.target = 'node';
    }
    return config;
  },
};

export default nextConfig;
