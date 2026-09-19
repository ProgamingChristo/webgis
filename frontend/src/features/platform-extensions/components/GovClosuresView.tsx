"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertOctagon, Navigation, ArrowRight, TrendingUp } from "lucide-react";
import { ROAD_CLOSURE_SCENARIOS } from "../data";

export function GovClosuresView() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(ROAD_CLOSURE_SCENARIOS[0].id);

  const scenario =
    ROAD_CLOSURE_SCENARIOS.find((s) => s.id === selectedScenarioId) || ROAD_CLOSURE_SCENARIOS[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-rose-100 bg-gradient-to-r from-red-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
              <AlertOctagon size={14} /> Manajemen Rekayasa Lalu Lintas & Pejalan Kaki
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Simulator Dampak Penutupan Jalan & Rekayasa Lalin
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-red-100">
              Simulasi dampak penutupan koridor utama (Car-Free Day, konstruksi MRT, perbaikan utilitas) terhadap waktu tempuh pejalan kaki dan pergeseran kunjungan usaha mikro lokal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-red-400 transition"
            >
              <Navigation size={16} /> Buka Peta Detour
            </Link>
          </div>
        </div>
      </section>

      {/* Scenario Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {ROAD_CLOSURE_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedScenarioId(s.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedScenarioId === s.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Scenario Details Box */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Skenario Aktif: {scenario.cause}
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1">{scenario.title}</h2>
            <p className="mt-2 text-sm text-slate-600">
              <strong>Koridor Terdampak: </strong> {scenario.affectedCorridor}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Rata-rata Deviasi Pejalan Kaki
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {scenario.pedestrianDetourAvgMeters > 0
                  ? `+${scenario.pedestrianDetourAvgMeters}m`
                  : `${scenario.pedestrianDetourAvgMeters}m (Shortcut)`}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                {scenario.pedestrianDetourAvgMeters > 0
                  ? "Pejalan kaki harus memutar melewati jalur sirip."
                  : "Pejalan kaki bebas melintasi jalan raya yang bebas polusi."}
              </span>
            </div>

            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100">
              <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                <TrendingUp size={13} /> Dampak Kunjungan UMKM
              </span>
              <p className="text-xs font-semibold text-emerald-950 mt-2 leading-relaxed">
                {scenario.merchantFootfallImpact}
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Jalur Pengalihan Ramah Pejalan Kaki yang Direkomendasikan
            </h3>
            <div className="flex flex-wrap gap-2">
              {scenario.recommendedAlleyRoutes.map((route, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  🚶 {route}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5 space-y-4">
          <h3 className="text-base font-black text-slate-900">
            Panduan Rekayasa Bagi Pengelola Kota
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sistem simulasi GETRA menghitung konektivitas pejalan kaki jaringan mikro (*pedestrian network graph*). Ketika badan jalan utama ditutup, algoritma rerouting Valhalla secara otomatis memetakan jalur sirip dan menghitung pergeseran kepadatan komuter.
          </p>
          <div className="rounded-xl bg-sky-50 p-4 text-xs text-sky-900 border border-sky-100 space-y-2">
            <p className="font-bold">Tips Optimalisasi Ekonomi:</p>
            <p className="leading-relaxed">
              Manfaatkan jalan sirip pengalihan sebagai zona sentra kuliner sementara bagi pedagang kaki lima terdaftar agar tidak terjadi penumpukan di persimpangan jalan protokol.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/app"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Uji Algoritma Rute Alternatif <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
