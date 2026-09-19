import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { EcoWalkView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Kalkulator Langkah Hijau & Jejak Karbon — GETRA",
  description: "Hitung penghematan emisi CO2 dan kalori kesehatan dari setiap langkah kaki komuter di Jakarta.",
};

export default function EcoWalkPage() {
  return (
    <GetraAppShell
      eyebrow="Mobilitas Berkelanjutan"
      title="Langkah Hijau & Pengurangan Emisi Karbon"
      description="Ketahui dampak positif berjalan kaki terhadap penurunan emisi karbon kota dan kebugaran tubuh Anda."
      tone="general"
    >
      <EcoWalkView />
    </GetraAppShell>
  );
}
