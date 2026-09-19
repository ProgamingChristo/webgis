import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { GovAccessibilityAuditView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Audit Inklusivitas Ruang Publik — GETRA",
  description: "Evaluasi kepatuhan infrastruktur jalan dan fasilitas umum terhadap Permen PUPR No. 14/2017.",
};

export default function GovAccessibilityAuditPage() {
  return (
    <GetraAppShell
      eyebrow="Audit Desain Universal"
      title="Audit Inklusivitas Ruang Publik & Aksesibilitas"
      description="Evaluasi parameter kepatuhan jalur pemandu, ramp, penyeberangan, dan ruang bebas rintangan trotoar."
      tone="admin"
    >
      <GovAccessibilityAuditView />
    </GetraAppShell>
  );
}
