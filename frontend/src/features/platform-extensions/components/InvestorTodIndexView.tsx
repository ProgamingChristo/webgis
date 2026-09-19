"use client";

import { useState } from "react";
import Link from "next/link";
import { Building, TrendingUp } from "lucide-react";
import { TOD_STATIONS } from "../data";

export function InvestorTodIndexView() {
  const [filterTier, setFilterTier] = useState<string>("ALL");

  const stations = filterTier === "ALL"
    ? TOD_STATIONS
    : TOD_STATIONS.filter((s) => s.investmentTier === filterTier);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Building size={14} /> Transit-Oriented Development Index
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Indeks Peluang Investasi Kawasan Berorientasi Transit
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-indigo-100">
              Pemberian skor komposit daya tarik komersial stasiun berdasarkan kelengkapan moda transit, volume komuter harian, walkability index, dan tingkat okupansi ritel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/business-space"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-400 transition"
            >
              <TrendingUp size={16} /> Buka Alat Bandingkan Kawasan
            </Link>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-2">
          {["ALL", "Sangat Tinggi", "Tinggi", "Menengah"].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setFilterTier(tier)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filterTier === tier
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tier === "ALL" ? "Semua Kawasan Transit" : `Tier ${tier}`}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Dihitung dengan Multi-Criteria Decision Analysis (MCDA)
        </span>
      </div>

      {/* TOD Stations Leaderboard */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stations.map((st) => (
          <div
            key={st.stationName}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700 uppercase">
                  Peringkat #{st.rank}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    st.investmentTier === "Sangat Tinggi"
                      ? "bg-emerald-100 text-emerald-800"
                      : st.investmentTier === "Tinggi"
                      ? "bg-sky-100 text-sky-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {st.investmentTier}
                </span>
              </div>

              <h3 className="text-base font-black text-slate-900 leading-snug mt-2">
                {st.stationName}
              </h3>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-700">{st.todScore}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Skor TOD / 100</span>
              </div>

              {/* Breakdown */}
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Moda Terintegrasi:</span>
                  <span className="font-bold text-slate-800">{st.transitModesCount} moda transportasi</span>
                </div>
                <div className="flex justify-between">
                  <span>Rata-rata Penumpang Harian:</span>
                  <span className="font-bold text-slate-800">
                    {st.dailyBoardingAvg.toLocaleString("id-ID")} komuter
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Skor Aksesibilitas Pejalan Kaki:</span>
                  <span className="font-bold text-emerald-600">{st.walkabilityScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Tingkat Okupansi Ritel Komersial:</span>
                  <span className="font-bold text-indigo-600">{st.retailOccupancyRate}%</span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
              <span className="text-slate-400">Peluang Sewa Tinggi</span>
              <Link href="/business-space" className="font-bold text-indigo-600 hover:text-indigo-700">
                Analisis Properti &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
