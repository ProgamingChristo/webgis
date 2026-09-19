import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { SafetyView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Peta Keamanan Pejalan Kaki & Jalur Malam — GETRA",
  description: "Pantau indeks pencahayaan jalan, pengawasan lingkungan, dan koridor pedestrian aman di malam hari.",
};

export default function SafetyPage() {
  return (
    <GetraAppShell
      eyebrow="Keamanan Publik"
      title="Peta Keamanan Pejalan Kaki & Rute Malam"
      description="Panduan koridor jalan kaki berpenerangan terang, terpantau kamera CCTV, dan dekat pos keamanan."
      tone="general"
    >
      <SafetyView />
    </GetraAppShell>
  );
}
