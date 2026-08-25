"use client";

import { GetraAppShell } from "@/src/components/getra-ui";
import { UmkmWorkspace } from "@/src/features/umkm-workspace";

export default function UmkmWorkspacePage() {
  return (
    <GetraAppShell
      description="Kelola merchant, submission, promosi, dan konteks usaha lokal tanpa meninggalkan ekosistem GETRA."
      eyebrow="GETRA for Business"
      title="Pusat Manajemen & Aktivasi UMKM"
      tone="umkm"
    >
      <UmkmWorkspace />
    </GetraAppShell>
  );
}
