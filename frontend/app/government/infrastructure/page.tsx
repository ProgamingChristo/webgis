import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { GovInfrastructureView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Audit Aset Pedestrian & Trotoar Kota — GETRA",
  description: "Inventarisasi kondisi fisik trotoar, lebar efektif, ubin pemandu, dan fasilitas penyeberangan jalan.",
};

export default function GovInfrastructurePage() {
  return (
    <GetraAppShell
      eyebrow="Manajemen Aset Kota"
      title="Audit Aset Pedestrian & Kondisi Trotoar"
      description="Basis data geospasial kondisi segmen trotoar kota Jakarta untuk pemeliharaan dan peningkatan fasilitas."
      tone="admin"
    >
      <GovInfrastructureView />
    </GetraAppShell>
  );
}
