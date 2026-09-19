import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { GovClosuresView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Simulator Dampak Penutupan Jalan — GETRA",
  description: "Simulasi detour pejalan kaki dan pergeseran kunjungan UMKM selama rekayasa lalu lintas dan Car-Free Day.",
};

export default function GovClosuresPage() {
  return (
    <GetraAppShell
      eyebrow="Rekayasa Lalu Lintas & Pejalan Kaki"
      title="Simulator Dampak Penutupan Jalan & CFD"
      description="Analisis deviasi pejalan kaki dan dampak ekonomi mikro saat koridor arteri ditutup sementara."
      tone="admin"
    >
      <GovClosuresView />
    </GetraAppShell>
  );
}
