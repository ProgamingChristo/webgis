import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { TransparencyStatusView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Status Sistem & Keandalan Layanan — GETRA",
  description: "Pantau ketersediaan operasional PostGIS, routing Valhalla, AI reasoning, dan gateway pembayaran secara real-time.",
};

export default function TransparencyStatusPage() {
  return (
    <GetraAppShell
      eyebrow="Transparansi & Reliabilitas"
      title="Status Sistem & Keandalan Layanan"
      description="Pemantauan waktu-nyata status operasional, latensi komputasi, dan tingkat ketersediaan layanan platform GETRA."
      tone="general"
    >
      <TransparencyStatusView />
    </GetraAppShell>
  );
}
