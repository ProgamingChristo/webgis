import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dibutuhkan untuk Docker image Christo
  output: "standalone",

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
