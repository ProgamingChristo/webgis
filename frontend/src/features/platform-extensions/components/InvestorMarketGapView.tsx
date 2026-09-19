"use client";

import Link from "next/link";
import { SearchCheck, Building2 } from "lucide-react";
import { MARKET_GAP_ITEMS } from "../data";

export function InvestorMarketGapView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-fuchsia-100 bg-gradient-to-r from-fuchsia-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-fuchsia-300">
              <SearchCheck size={14} /> Analisis Celah Permintaan Pasar Spasial
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Peluang Ritel & Kategori Belum Terlayani di Sekitar Transit
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-fuchsia-100">
              Menemukan jenis usaha yang memiliki rasio permintaan komuter tinggi namun masih minim persaingan di radius 300 - 500 meter stasiun.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/business-space"
              className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-fuchsia-400 transition"
            >
              <Building2 size={16} /> Buka Peta Analisis Ruang
            </Link>
          </div>
        </div>
      </section>

      {/* Gap Items Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900">
          Celah Peluang Usaha Terbaik Saat Ini ({MARKET_GAP_ITEMS.length})
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {MARKET_GAP_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
            >
              <div>
                <span className="text-[11px] font-bold text-fuchsia-600 uppercase tracking-wider">
                  {item.stationZone}
                </span>

                <h3 className="text-base font-black text-slate-900 leading-snug mt-1">
                  {item.missingCategory}
                </h3>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-fuchsia-700">
                    {item.viabilityScore}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Skor Kelayakan / 100
                  </span>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Estimasi Permintaan Komuter:</span>
                    <span className="font-semibold text-slate-800">{item.estimatedUnmetDemand}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jumlah Pesaing di Radius 500m:</span>
                    <span className="font-bold text-slate-900">
                      {item.nearbyCompetitorCount === 0
                        ? "0 Pesaing Langsung (Peluang Emas)"
                        : `${item.nearbyCompetitorCount} unit`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-fuchsia-50/70 p-3 text-xs text-fuchsia-900 border border-fuchsia-100">
                  <strong className="font-bold block mb-1">Rekomendasi Bisnis:</strong>
                  {item.recommendedAction}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
                <span className="text-slate-400">Tingkat Risiko: Rendah</span>
                <Link href="/business-space" className="font-bold text-fuchsia-600 hover:text-fuchsia-700">
                  Eksplorasi Lahan &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
