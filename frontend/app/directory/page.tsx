import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { DirectoryView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Direktori UMKM Terverifikasi — GETRA",
  description: "Cari ribuan kuliner lokal, jajanan, kedai kopi, dan usaha mikro dalam jangkauan jalan kaki dari stasiun.",
};

export default function DirectoryPage() {
  return (
    <GetraAppShell
      eyebrow="Ekosistem Usaha Lokal"
      title="Direktori & Katalog UMKM Terverifikasi"
      description="Temukan usaha lokal pilihan berdasarkan kategori, tingkat harga, dan jarak dari stasiun transit terdekat."
      tone="umkm"
    >
      <DirectoryView />
    </GetraAppShell>
  );
}
