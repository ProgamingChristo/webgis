"use client";

import React from "react";
import { Info } from "lucide-react";

export function AnalyticsDisclaimer() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-xs text-sky-900">
      <Info size={16} className="mt-0.5 shrink-0 text-sky-600" />
      <p className="leading-relaxed">
        <strong>Perlu diketahui:</strong> Statistik GETRA menunjukkan tayangan dan interaksi promosi. Angka ini bukan jumlah penjualan atau jaminan hasil usaha.
      </p>
    </div>
  );
}
