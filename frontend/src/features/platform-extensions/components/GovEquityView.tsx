"use client";

import { useState } from "react";
import Link from "next/link";
import { Scale, Building2 } from "lucide-react";
import { FOOD_DESERT_AREAS } from "../data";

export function GovEquityView() {
  const [filterHighRiskOnly, setFilterHighRiskOnly] = useState<boolean>(false);

  const areas = filterHighRiskOnly
    ? FOOD_DESERT_AREAS.filter((a) => a.riskLevel !== "Rendah")
    : FOOD_DESERT_AREAS;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-300">
              <Scale size={14} /> Perencanaan Spasial & Kebijakan Kota
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Dasbor Ekuitas Spasial & Aksesibilitas Kebutuhan Pangan
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-purple-100">
              Analisis isochrone jangkauan jalan kaki pejalan kaki (400m & 800m) ke fasilitas pangan segar, minimarket, dan UMKM sembako untuk mencegah terbentuknya zona kesenjangan akses (*food desert*).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-purple-400 transition"
            >
              <Building2 size={16} /> Tinjau Layer Spasial di Peta
            </Link>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterHighRiskOnly}
            onChange={(e) => setFilterHighRiskOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          Hanya tampilkan kelurahan dengan risiko kesenjangan pangan sedang / tinggi
        </label>

        <span className="text-xs text-slate-500 font-medium">
          Metodologi: Isochrone Valhalla Network Walking Catchment 5 & 10 Menit
        </span>
      </div>

      {/* Areas Table / Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {areas.map((a) => (
          <div
            key={a.subdistrict}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
                    Wilayah Administrasi
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-snug mt-0.5">
                    {a.subdistrict}
                  </h3>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                    a.riskLevel === "Rendah"
                      ? "bg-emerald-100 text-emerald-800"
                      : a.riskLevel === "Sedang"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  Risiko {a.riskLevel}
                </span>
              </div>

              {/* Spatial metrics */}
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Populasi Warga:</span>
                  <span className="font-bold text-slate-800">
                    {a.residentialPopulation.toLocaleString("id-ID")} jiwa
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Terjangkau 400m (~5 menit jalan kaki):</span>
                    <span className="text-purple-700 font-bold">{a.within400mRatio}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${a.within400mRatio}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Terjangkau 800m (~10 menit jalan kaki):</span>
                    <span className="text-emerald-700 font-bold">{a.within800mRatio}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${a.within800mRatio}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                <strong className="font-bold text-slate-900 block mb-1">
                  Rekomendasi Kebijakan Dinas / Pemda:
                </strong>
                {a.priorityAction}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">Skor Akses Pangan: <strong>{a.foodAccessIndex}/100</strong></span>
              <Link href="/app" className="font-bold text-purple-600 hover:text-purple-700">
                Tinjau Wilayah &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
