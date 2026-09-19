import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { InternationalPortalView } from "@/src/features/international";

export const metadata: Metadata = {
  title: "Portal Smart City & WebGIS Internasional — GETRA",
  description: "Platform komprehensif 50 modul pemetaan spasial skala dunia: CCTV cerdas, macet, transit multimoda, iklim, dan IoT kota global.",
};

export default function InternationalPortalPage() {
  return (
    <GetraAppShell
      eyebrow="GETRA Global Engine"
      title="Portal Smart City & WebGIS Internasional"
      description="Katalog 50 fitur pemetaan geospasial tingkat dunia untuk kota cerdas dan mobilitas pejalan kaki berstandar global."
      tone="community"
    >
      <InternationalPortalView />
    </GetraAppShell>
  );
}
