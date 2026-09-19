import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { DealsView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Promo Kilat & Diskon Komunitas UMKM — GETRA",
  description: "Dapatkan penawaran harga spesial dan voucher diskon belanja hemat di UMKM dekat stasiun transit.",
};

export default function DealsPage() {
  return (
    <GetraAppShell
      eyebrow="Penawaran Komunitas"
      title="Promo Kilat & Diskon Usaha Lokal"
      description="Dukung pedagang mikro lokal di rute harian Anda dengan penawaran menarik dan voucher hemat."
      tone="umkm"
    >
      <DealsView />
    </GetraAppShell>
  );
}
