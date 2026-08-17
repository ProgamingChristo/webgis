import type { NextConfig } from "next";
import { API_STATIC_SECURITY_HEADERS } from "./src/lib/api-security/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [...API_STATIC_SECURITY_HEADERS],
      },
    ];
  },
};

export default nextConfig;
