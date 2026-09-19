"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, Clock, Building2, BarChart3 } from "lucide-react";
import { FOOT_TRAFFIC_DATA } from "../data";

export function InvestorFootTrafficView() {
  const [selectedCorridor, setSelectedCorridor] = useState<string>("Kawasan Transit Dukuh Atas");

  const corridors = Array.from(new Set(FOOT_TRAFFIC_DATA.map((d) => d.corridor)));
  const filteredData = FOOT_TRAFFIC_DATA.filter((d) => d.corridor === selectedCorridor);

  const maxVolume = Math.max(...filteredData.map((d) => d.pedestrianVolumePerHour));

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-300">
              <TrendingUp size={14} /> Inteligensi Properti Komersial & Arus Komuter
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Inteligensi Kepadatan & Arus Pejalan Kaki (Footfall)
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-violet-100">
              Data spasial temporal arus pejalan kaki per jam di koridor transit utama Jakarta untuk penentuan lokasi ritel strategis, sewa ruang usaha, dan analisis pasar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/business-space"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-violet-400 transition"
            >
              <Building2 size={16} /> Buka Ruang Usaha Investor
            </Link>
          </div>
        </div>
      </section>

      {/* Corridor Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-2">
          {corridors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCorridor(c)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                selectedCorridor === c
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
          <Clock size={13} /> Rentang Pengukuran: 06:00 - 22:00 WIB
        </span>
      </div>

      {/* Hourly Footfall Chart View */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600">
            Kurva Distribusi Arus Pejalan Kaki
          </span>
          <h2 className="text-lg font-black text-slate-900">{selectedCorridor}</h2>
        </div>

        <div className="space-y-4">
          {filteredData.map((point) => {
            const percentage = Math.round((point.pedestrianVolumePerHour / maxVolume) * 100);
            return (
              <div key={point.hour} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 w-16">Pukul {point.hour}</span>
                  <span className="text-slate-900 font-black">
                    {point.pedestrianVolumePerHour.toLocaleString("id-ID")} pejalan kaki/jam
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                      point.crowdLevel === "Puncak"
                        ? "bg-rose-100 text-rose-800"
                        : point.crowdLevel === "Padat"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {point.crowdLevel}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      point.crowdLevel === "Puncak"
                        ? "bg-violet-600"
                        : point.crowdLevel === "Padat"
                        ? "bg-sky-500"
                        : "bg-slate-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Commercial Takeaways */}
        <div className="rounded-xl bg-violet-50/70 p-4 border border-violet-100 text-xs text-violet-900 space-y-2">
          <p className="font-bold flex items-center gap-1">
            <BarChart3 size={14} /> Kesimpulan Peluang Komersial:
          </p>
          <p className="leading-relaxed">
            Puncak arus komuter terkonsentrasi pada pagi hari (07:30 - 09:00 WIB) dan petang (17:30 - 19:30 WIB). Sangat ideal untuk unit ritel F&B siap saji, kedai kopi cepat, serta toko kebutuhan harian *grab-and-go*.
          </p>
        </div>
      </div>
    </div>
  );
}
