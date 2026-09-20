import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localDevOrigins = [
  ...new Set(
    Object.values(networkInterfaces()).flatMap((addresses) =>
      (addresses ?? [])
        .filter(
          (address) => address.family === "IPv4" && !address.internal,
        )
        .map((address) => address.address),
    ),
  ),
];

const nextConfig: NextConfig = {
  // Izinkan browser mengakses dev assets lewat alamat LAN laptop yang aktif.
  allowedDevOrigins: localDevOrigins,

  // A separate output directory permits an isolated routing preview beside the owner's dev server.
  distDir: process.env.GETRA_FRONTEND_DIST_DIR || ".next",
  // Dibutuhkan untuk Docker image Christo
  output: "standalone",

  images: {
    remotePatterns: [
      {
        hostname: "mapidstorage.cdn.mapid.io",
        protocol: "https",
      },
      {
        hostname: "mapid-app-chat.cdn.mapid.io",
        protocol: "https",
      },
      {
        // Supabase storage — digunakan untuk avatar profil, foto sampul usaha, dan foto menu.
        // Format: https://<project-ref>.supabase.co/storage/v1/object/public/**
        hostname: "*.supabase.co",
        protocol: "https",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Jangan expose header X-Powered-By
  poweredByHeader: false,

  reactStrictMode: true,

  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.sandbox.midtrans.com https://app.midtrans.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: *.supabase.co *.mapid.io mapidstorage.cdn.mapid.io mapid-app-chat.cdn.mapid.io",
      "connect-src 'self' https: wss: http://localhost:8080 http://localhost:8180 https://getra-routing-api.tail0ed517.ts.net https://*.supabase.co https://app.sandbox.midtrans.com https://app.midtrans.com",
      "frame-src 'self' https://jakcctv.jakarta.go.id https://dki-jkt.balitower.co.id:7028 https://cctv-jsc.balitower.co.id:8011 https://app.sandbox.midtrans.com https://app.midtrans.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      // Global security headers untuk seluruh GETRA
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
