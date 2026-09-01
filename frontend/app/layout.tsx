import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

import { AuthProvider } from "@/src/components/providers/AuthProvider";
import { StakeholderProvider } from "@/src/components/providers/StakeholderProvider";

export const metadata: Metadata = {
  title: "GETRA — Geo-Enabled Transit & Retail Analytics",
  description:
    "WebGIS spatial intelligence untuk transportasi massal, akses pedestrian, UMKM, dan kawasan transit.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <StakeholderProvider>
            {children}
          </StakeholderProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
