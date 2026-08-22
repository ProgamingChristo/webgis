import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

import { AuthProvider } from "@/src/components/providers/AuthProvider";
import { StakeholderProvider } from "@/src/components/providers/StakeholderProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GETRA — Geo-Enabled Transit & Retail Analytics",
  description: "WebGIS spatial decision support untuk akses transit dan peluang ekonomi lokal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          <StakeholderProvider>
            {children}
          </StakeholderProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
