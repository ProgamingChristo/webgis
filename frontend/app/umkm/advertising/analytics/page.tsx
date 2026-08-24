"use client";

import { Suspense } from "react";
import { AnalyticsDashboard } from "@/src/features/umkm-advertising/analytics";

export default function CampaignAnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">Memuat analitik...</p>
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </main>
  );
}
