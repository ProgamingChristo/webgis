import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { OpenDataView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Portal Data Terbuka GIS & Pengembang — GETRA",
  description: "Akses dataset geospasial jaringan pejalan kaki, titik transit, dan API GETRA berformat standar GeoJSON.",
};

export default function OpenDataPage() {
  return (
    <GetraAppShell
      eyebrow="Ekosistem Terbuka"
      title="Portal Data Terbuka GIS & Dokumentasi API"
      description="Unduh dataset geospasial terbuka berformat GeoJSON dan eksplorasi endpoint API untuk riset perkotaan."
      tone="general"
    >
      <OpenDataView />
    </GetraAppShell>
  );
}
