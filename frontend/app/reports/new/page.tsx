import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { HazardReportView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Lapor Hambatan Trotoar & Fasilitas Pejalan Kaki — GETRA",
  description: "Formulir pelaporan warga untuk trotoar rusak, ubin pemandu difabel terputus, dan parkir liar.",
};

export default function NewReportPage() {
  return (
    <GetraAppShell
      eyebrow="Partisipasi Publik"
      title="Laporkan Kendala Jalur Pejalan Kaki"
      description="Kirim laporan hambatan fisik trotoar untuk memperingatkan pejalan kaki lain dan memprioritaskan perbaikan dinas."
      tone="community"
    >
      <HazardReportView />
    </GetraAppShell>
  );
}
