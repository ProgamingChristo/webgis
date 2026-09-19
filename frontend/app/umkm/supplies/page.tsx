import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { SuppliesView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Bursa Pemasok Grosir Bahan Baku UMKM — GETRA",
  description: "Hubungkan usaha kuliner dan kerajinan dengan pasar tradisional dan pedagang grosir terdekat di Jakarta.",
};

export default function SuppliesPage() {
  return (
    <GetraAppShell
      eyebrow="Rantai Pasok Lokal"
      title="Bursa Pemasok & Sentra Grosir Bahan Baku"
      description="Temukan pasar tradisional dan distributor lokal terdekat untuk efisiensi rantai pasok usaha mikro."
      tone="umkm"
    >
      <SuppliesView />
    </GetraAppShell>
  );
}
