import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for Docker
  output: 'standalone',
  
  reactStrictMode: true,
  
  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Gzip compress all responses
  compress: true,

  // Allow next/image to optimise remote images from Cloudinary and known CDNs
  // NOTE: Supabase removed — migrated to Neon (no file storage via Supabase anymore)
  images: {
    // Disable Vercel's default API image optimization to dramatically reduce cost/usage limits.
    // Instead, we will directly serve them or rely on an external CDN (e.g. Cloudflare Images/R2)
    unoptimized: false,
    // Cache optimised images for 24 h — critical to stay within Vercel's 1,000/month limit
    minimumCacheTTL: 86400,
    // Prefer AVIF, fall back to WebP
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // Unsplash CDN
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        // UI Avatars / DiceBear / other avatar services
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudflarestorage.com",
        pathname: "/**",
      },
    ],
  },

  // Tree-shake large packages at build time — reduces JS bundle size
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  
  // Configure headers for PWA
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
