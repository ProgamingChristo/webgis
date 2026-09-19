"use client";

import { useState } from "react";
import Link from "next/link";
import { Accessibility, AlertTriangle, CheckCircle2, XCircle, Navigation, ShieldCheck } from "lucide-react";
import { ACCESSIBILITY_CORRIDORS } from "../data";

export function AccessibilityView() {
  const [filterOnlyRecommended, setFilterOnlyRecommended] = useState<boolean>(false);

  const corridors = filterOnlyRecommended
    ? ACCESSIBILITY_CORRIDORS.filter((c) => c.wheelchairRecommended)
    : ACCESSIBILITY_CORRIDORS;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-900 to-emerald-950 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300">
              <Accessibility size={14} /> Mobilitas Universal & Inklusif
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Panduan Aksesibilitas Pejalan Kaki & Ramah Kursi Roda
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-teal-100">
              Audit koridor trotoar bebas hambatan, ketersediaan ubin pemandu (guiding blocks), kelandaian ramp kursi roda, dan laporan rintangan fisik di Jakarta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/reports/new"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-400 transition"
            >
              <AlertTriangle size={16} /> Laporkan Rintangan Trotoar
            </Link>
          </div>
        </div>
      </section>

      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterOnlyRecommended}
              onChange={(e) => setFilterOnlyRecommended(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Hanya tampilkan koridor ramah kursi roda (Skor &gt; 80)
          </label>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Standar: Permen PUPR No. 14/PRT/M/2017 tentang Kemudahan Bangunan & Lingkungan
        </div>
      </div>

      {/* Corridor Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {corridors.map((c) => (
          <div
            key={c.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {c.subdistrict}
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-snug mt-0.5">
                    {c.name}
                  </h3>
                </div>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm ${
                    c.overallScore >= 90
                      ? "bg-emerald-100 text-emerald-800"
                      : c.overallScore >= 75
                      ? "bg-sky-100 text-sky-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {c.overallScore}
                </div>
              </div>

              {/* Badges & Metrics */}
              <div className="mt-4 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Rekomendasi Kursi Roda:</span>
                  {c.wheelchairRecommended ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <CheckCircle2 size={14} /> Sangat Direkomendasikan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                      <XCircle size={14} /> Belum Memadai
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Ubin Pemandu (Guiding Block):</span>
                  <span className="font-semibold text-slate-800">{c.tactilePavingQuality}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Kualitas Ramp Trotoar:</span>
                  <span className="font-semibold text-slate-800">{c.curbRampsQuality}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Lebar Efektif Trotoar:</span>
                  <span className="font-semibold text-slate-800">{c.sidewalkWidthMeters} meter</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Laporan Hambatan Aktif:</span>
                  <span
                    className={`font-bold ${
                      c.activeBarriersCount === 0 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {c.activeBarriersCount} titik
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
              <Link
                href="/app"
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
              >
                <Navigation size={13} /> Tinjau di Peta
              </Link>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <ShieldCheck size={13} /> Terverifikasi GETRA
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
