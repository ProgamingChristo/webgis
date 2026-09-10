import type { Metadata } from "next";

import { LandingPage } from "@/src/features/landing";

export const metadata: Metadata = {
  title: "GETRA — Peta Transit dan Usaha",
  description:
    "Peta untuk menjelajahi transportasi, akses berjalan kaki, UMKM, dan kawasan transit.",
};

export default function HomePage() {
  return <LandingPage />;
}
