import type { Metadata } from "next";
import { GetraAppShell } from "@/src/components/getra-ui";
import { GlobalDataCenter } from "@/src/features/international/components/GlobalDataCenter";

export const metadata: Metadata = {
  title: "Global Data Center ? GETRA",
  description: "Peta data publik dengan sumber, timestamp dan status koneksi yang transparan.",
};

export default function InternationalPortalPage() {
  return (
    <GetraAppShell
      fullWidth
      tone="community"
    >
      <GlobalDataCenter />
    </GetraAppShell>
  );
}
