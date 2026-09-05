"use client";

import { Suspense } from "react";
import { GetraAppShell } from "@/src/components/getra-ui";
import { UmkmWorkspace } from "@/src/features/umkm-workspace";

export default function UmkmWorkspacePage() {
  return (
    <GetraAppShell
      tone="umkm"
      showContextNavigation={false}
    >
      <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-300">Memuat usaha Anda...</p>}><UmkmWorkspace /></Suspense>
    </GetraAppShell>
  );
}
