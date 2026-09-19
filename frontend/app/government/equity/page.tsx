import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { GovEquityView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Dasbor Ekuitas Spasial & Aksesibilitas Pangan — GETRA",
  description: "Analisis isochrone jangkauan kebutuhan pokok dan pencegahan food desert di kelurahan Jakarta.",
};

export default function GovEquityPage() {
  return (
    <GetraAppShell
      eyebrow="Perencanaan Tata Kota"
      title="Dasbor Ekuitas Spasial & Aksesibilitas Pangan"
      description="Analisis rasio keterjangkauan jalan kaki warga ke komoditas pangan pokok untuk pembuatan kebijakan publik."
      tone="admin"
    >
      <GovEquityView />
    </GetraAppShell>
  );
}
