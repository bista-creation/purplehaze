import type { NextConfig } from "next";
import { isLocalhostAppUrl, normalizeAppUrl } from "./src/lib/app-url";

const vercelHost =
  process.env.VERCEL_ENV === "production"
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : (process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL);
const vercelUrl = vercelHost
  ? normalizeAppUrl(
      vercelHost.startsWith("http") ? vercelHost : `https://${vercelHost}`,
    )
  : undefined;
const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const appUrl = normalizeAppUrl(
  vercelUrl && (!configuredAppUrl || isLocalhostAppUrl(configuredAppUrl))
    ? vercelUrl
    : configuredAppUrl,
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  outputFileTracingExcludes: {
    // These admin screens now use the public asset URLs and Blob for uploaded
    // media; they do not need copies of the static image tree inside Functions.
    "/admin/menu": ["./public/images/**"],
    "/admin/venues": ["./public/images/**"],
    "/admin/content/gallery": ["./public/images/**"],
    "/admin/content/banners": ["./public/images/**"],
  },
  env: {
    NEXT_PUBLIC_APP_URL: appUrl,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-device-id, idempotency-key, x-forwarded-for, x-order-token, *" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              'camera=(), microphone=(self "https://mani-ai-psi.vercel.app"), geolocation=(self)',
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
