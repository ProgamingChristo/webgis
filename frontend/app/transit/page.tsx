import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { TransitView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Hub Transit & Interkoneksi UMKM — GETRA",
  description: "Eksplorasi simpul transportasi umum Jabodetabek dan usaha mikro di sekitarnya dalam jangkauan jalan kaki.",
};

export default function TransitPage() {
  return (
    <GetraAppShell
      eyebrow="Transportasi & Kawasan Transit"
      title="Simpul Antarmoda & Kawasan Transit"
      description="Jelajahi titik integrasi stasiun KRL, MRT, LRT, TransJakarta, dan sebaran UMKM terdekat."
      tone="general"
    >
      <TransitView />
    </GetraAppShell>
  );
}
