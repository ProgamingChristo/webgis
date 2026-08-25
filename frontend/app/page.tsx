import type { Metadata } from "next";

import { LandingPage } from "@/src/features/landing";

export const metadata: Metadata = {
  title: "GETRA — Geo-Enabled Transit & Retail Analytics",
  description:
    "WebGIS spatial intelligence untuk transportasi massal, akses pedestrian, UMKM, dan kawasan transit.",
};

export default function HomePage() {
  return <LandingPage />;
}
