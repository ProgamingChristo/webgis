import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

import { AuthProvider } from "@/src/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: "GETRA — Geo-Enabled Transit & Retail Analytics",
  description:
    "WebGIS spatial decision support untuk akses transit dan peluang ekonomi lokal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
