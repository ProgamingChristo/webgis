import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { CctvPlatformShell } from "@/src/features/cctv-platform";

export const metadata: Metadata = {
  title: "Live CCTV & Urban Sensors — GETRA",
  description:
    "Pantau kamera publik CCTV DKI Jakarta, analisis AI computer vision, dan sensor kota (kualitas udara, banjir, cuaca) dengan sumber serta waktu pembaruan yang jelas. REAL CAMERA ≠ AI ANALYTICS ≠ SENSOR.",
};

export default function CctvPlatformPage() {
  return (
    <GetraAppShell
      eyebrow="GETRA CCTV Platform"
      title="Global CCTV & Urban Sensors"
      description="Kamera publik DKI Jakarta, AI Vision, dan sensor kota dalam satu platform geospasial."
      tone="community"
    >
      <CctvPlatformShell />
    </GetraAppShell>
  );
}
