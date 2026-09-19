import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { AccessibilityView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Panduan Aksesibilitas Pejalan Kaki — GETRA",
  description: "Audit koridor trotoar bebas hambatan, ubin pemandu difabel, dan fasilitas ramah kursi roda di Jakarta.",
};

export default function AccessibilityPage() {
  return (
    <GetraAppShell
      eyebrow="Mobilitas Universal"
      title="Panduan Aksesibilitas & Ramah Kursi Roda"
      description="Informasi rute bebas undakan, ubin pemandu, kelandaian ramp, dan audit trotoar inklusif."
      tone="general"
    >
      <AccessibilityView />
    </GetraAppShell>
  );
}
