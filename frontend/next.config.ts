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
  // Alamat dapat berubah saat berpindah Wi-Fi atau hotspot.
  allowedDevOrigins: localDevOrigins,

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
    ],
  },

  // Jangan expose header X-Powered-By
  poweredByHeader: false,

  reactStrictMode: true,

  async headers() {
    return [
      // Global security headers untuk seluruh GETRA
      {
        source: "/(.*)",
        headers: [
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
