import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { InvestorTodIndexView } from "@/src/features/platform-extensions";

export const metadata: Metadata = {
  title: "Indeks Peluang Investasi TOD — GETRA",
  description: "Peringkat daya tarik komersial kawasan transit berorientasi transit (TOD) Jabodetabek.",
};

export default function InvestorTodIndexPage() {
  return (
    <GetraAppShell
      eyebrow="Investasi Berorientasi Transit"
      title="Indeks Peluang Komersial Kawasan TOD"
      description="Penilaian komposit daya tarik komersial stasiun berdasarkan konektivitas antarmoda dan okupansi ritel."
      tone="general"
    >
      <InvestorTodIndexView />
    </GetraAppShell>
  );
}
