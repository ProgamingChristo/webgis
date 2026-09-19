import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { InvestorMarketGapView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Analisis Celah Pasar Ritel Spasial — GETRA",
  description: "Temukan sektor usaha dengan permintaan komuter tinggi yang belum terlayani di walkshed transit.",
};

export default function InvestorMarketGapPage() {
  return (
    <GetraAppShell
      eyebrow="Analisis Permintaan & Penawaran"
      title="Celah Pasar Ritel & Sektor Belum Terlayani"
      description="Identifikasi kategori usaha yang dicari oleh ribuan komuter namun masih minim persaingan di radius stasiun."
      tone="general"
    >
      <InvestorMarketGapView />
    </GetraAppShell>
  );
}
