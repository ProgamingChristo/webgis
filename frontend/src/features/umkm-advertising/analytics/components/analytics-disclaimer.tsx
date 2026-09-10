"use client";

import React from "react";
import { Info } from "lucide-react";

export function AnalyticsDisclaimer() {
  return (
    <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5 text-slate-400 text-xs">
      <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        <strong>Perlu diketahui:</strong> Statistik GETRA menunjukkan tayangan dan interaksi promosi. Angka ini bukan jumlah penjualan atau jaminan hasil usaha.
      </p>
    </div>
  );
}
