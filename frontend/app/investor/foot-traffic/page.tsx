import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { InvestorFootTrafficView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Inteligensi Kepadatan & Arus Pejalan Kaki — GETRA",
  description: "Kurva kepadatan komuter per jam dan volume footfall koridor transit untuk analisis investasi ritel.",
};

export default function InvestorFootTrafficPage() {
  return (
    <GetraAppShell
      eyebrow="Inteligensi Komersial"
      title="Kepadatan & Arus Pejalan Kaki (Footfall)"
      description="Analisis volume lalu lintas pejalan kaki per jam di koridor komersial dan stasiun transit Jakarta."
      tone="general"
    >
      <InvestorFootTrafficView />
    </GetraAppShell>
  );
}
