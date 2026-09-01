"use client";

import { Suspense } from "react";
import { MerchantSubmissionForm } from "@/src/features/merchant-submission";
import { GetraAppShell } from "@/src/components/getra-ui";

export default function NewMerchantSubmissionPage() {
  return (
    <GetraAppShell tone="umkm">
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">Memuat formulir...</p>
          </div>
        }
      >
        <MerchantSubmissionForm />
      </Suspense>
    </GetraAppShell>
  );
}
