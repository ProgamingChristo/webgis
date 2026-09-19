import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { CulinaryTrailsView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Rute Wisata Kuliner Pejalan Kaki — GETRA",
  description: "Rencana perjalanan kuliner tematik terkurasi melintasi warisan rasa dan jajanan legendaris Jakarta.",
};

export default function CulinaryTrailsPage() {
  return (
    <GetraAppShell
      eyebrow="Gastronomi & Warisan Rasa"
      title="Rute Wisata Kuliner Pejalan Kaki"
      description="Jelajahi kelezatan kuliner otentik Jakarta melalui rencana perjalanan jalan santai terkurasi."
      tone="general"
    >
      <CulinaryTrailsView />
    </GetraAppShell>
  );
}
