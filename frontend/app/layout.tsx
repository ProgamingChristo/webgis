import type { Metadata } from "next";
import {
  DM_Sans,
  DM_Serif_Display,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

import { AuthProvider } from "@/src/components/providers/AuthProvider";
import { StakeholderProvider } from "@/src/components/providers/StakeholderProvider";

const sansFont = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-getra-sans" });
const landingDisplayFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-getra-landing-display",
});
const displayFont = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-getra-display",
});
const monoFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-getra-mono" });

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
    <html
      lang="id"
      className={`${sansFont.variable} ${landingDisplayFont.variable} ${displayFont.variable} ${monoFont.variable}`}
    >
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
