import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { QuestsView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Tantangan Pemetaan Warga & Sains Partisipatif — GETRA",
  description: "Kerjakan misi pemetaan lapangan, kumpulkan poin kontribusi (XP), dan raih lencana kehormatan komunitas.",
};

export default function QuestsPage() {
  return (
    <GetraAppShell
      eyebrow="Komunitas & Gamifikasi"
      title="Tantangan Pemetaan Warga & Misi Komunitas"
      description="Verifikasi aksesibilitas trotoar, jam buka warung lokal, dan bantu tingkatkan kualitas data peta Jakarta."
      tone="community"
    >
      <QuestsView />
    </GetraAppShell>
  );
}
