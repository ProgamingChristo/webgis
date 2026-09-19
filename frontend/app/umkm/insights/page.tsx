import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { UmkmInsightsView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Wawasan Operasional & Keramaian Pejalan Kaki — GETRA",
  description: "Dasbor inteligensi bisnis UMKM: estimasi pejalan kaki yang melintas, jam tersibuk, dan radar kompetitor.",
};

export default function UmkmInsightsPage() {
  return (
    <GetraAppShell
      eyebrow="Inteligensi Usaha Mikro"
      title="Wawasan Operasional & Keramaian Pejalan Kaki"
      description="Optimalkan jam buka, strategi harga, dan promosi berdasarkan pola lalu lintas pejalan kaki di sekitar warung Anda."
      tone="umkm"
    >
      <UmkmInsightsView />
    </GetraAppShell>
  );
}
