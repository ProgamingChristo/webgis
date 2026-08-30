"use client";

import { GetraAppShell } from "@/src/components/getra-ui";
import { UmkmWorkspace } from "@/src/features/umkm-workspace";

export default function UmkmWorkspacePage() {
  return (
    <GetraAppShell
      description="Kelola profil usaha, discoverability, intelligence lokasi, dan promosi spasial tanpa mengubah role akun."
      eyebrow="GETRA for Business"
      title="UMKM Workspace"
      tone="umkm"
    >
      <UmkmWorkspace />
    </GetraAppShell>
  );
}
